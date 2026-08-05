import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SYSTEM_PROMPTS = {
  explain: `You are Alex, an AI tutor for the ADD Academy LLM course. You explain machine learning and LLM concepts clearly with examples. Be encouraging, patient, and use analogies. Keep responses concise (2-3 paragraphs max). If the student asks about a specific lecture topic, provide context from that lecture.`,
  debug: `You are Alex, an AI debugging assistant for the ADD Academy LLM course. Help students debug their Python code related to building LLMs. Ask clarifying questions, identify bugs, suggest fixes. Show corrected code when appropriate. Be supportive — debugging is a learning opportunity.`,
  build: `You are Alex, an AI project guide for the ADD Academy LLM course. Help students build practical AI projects step by step. Break down complex tasks into manageable steps. Suggest architectures, libraries, and best practices. Encourage experimentation.`,
};

/** Check whether a school-enrolled student has exceeded their daily AI tutor limit */
async function checkSchoolRateLimit(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
): Promise<{ allowed: boolean; limit?: number; used?: number }> {
  // Find the student's school (if any) and its daily limit
  const { data: student } = await supabase
    .from('academy_students')
    .select('school_id')
    .eq('user_id', userId)
    .single();

  if (!student?.school_id) return { allowed: true }; // not a school student — no limit

  const { data: school } = await supabase
    .from('academy_schools')
    .select('ai_tutor_daily_limit')
    .eq('id', student.school_id)
    .single();

  if (!school) return { allowed: true };

  const dailyLimit = school.ai_tutor_daily_limit ?? 50;

  // Count today's conversations for this student
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('academy_ai_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', userId)
    .gte('created_at', today.toISOString());

  const used = count ?? 0;
  return { allowed: used < dailyLimit, limit: dailyLimit, used };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { message, mode, lectureId, language, history, conversationId } =
      await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check school rate limit
    const rateCheck = await checkSchoolRateLimit(supabase, user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily AI tutor limit reached',
          limit: rateCheck.limit,
          used: rateCheck.used,
        },
        { status: 429 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        response: getPlaceholderResponse(mode, message, language),
      });
    }

    const systemPrompt =
      SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS] ||
      SYSTEM_PROMPTS.explain;
    const langContext =
      language !== 'en'
        ? `\nRespond in ${language === 'ro' ? 'Romanian' : 'Greek'} if the student writes in that language.`
        : '';
    const lectureContext =
      lectureId && lectureId !== 'home'
        ? `\nThe student is currently on Lecture ${lectureId}.`
        : '';

    const messages = [
      ...(history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt + langContext + lectureContext }],
          },
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return NextResponse.json({
        response: getPlaceholderResponse(mode, message, language),
      });
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Sorry, I could not generate a response.';

    // Estimate token usage (rough: ~4 chars per token)
    const tokensUsed = Math.ceil(
      (message.length + text.length + (systemPrompt + langContext + lectureContext).length) / 4
    );

    // Persist conversation to Supabase
    let savedConversationId = conversationId;
    try {
      const userMsg = { role: 'user', content: message, timestamp: new Date().toISOString() };
      const assistantMsg = { role: 'assistant', content: text, timestamp: new Date().toISOString() };

      if (conversationId) {
        // Append to existing conversation
        const { data: existing } = await supabase
          .from('academy_ai_conversations')
          .select('messages, tokens_used')
          .eq('id', conversationId)
          .eq('student_id', user.id)
          .single();

        if (existing) {
          const updatedMessages = [...(existing.messages || []), userMsg, assistantMsg];
          await supabase
            .from('academy_ai_conversations')
            .update({
              messages: updatedMessages,
              tokens_used: (existing.tokens_used || 0) + tokensUsed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conversationId);
        }
      } else {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('academy_ai_conversations')
          .insert({
            student_id: user.id,
            lecture_id: lectureId || null,
            mode: mode || 'explain',
            messages: [userMsg, assistantMsg],
            tokens_used: tokensUsed,
          })
          .select('id')
          .single();

        savedConversationId = newConv?.id;
      }
    } catch (err) {
      // Don't fail the response if persistence fails
      console.error('Failed to persist conversation:', err);
    }

    return NextResponse.json({
      response: text,
      conversationId: savedConversationId,
    });
  } catch (error) {
    console.error('AI Tutor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getPlaceholderResponse(
  mode: string,
  _message: string,
  _language: string
): string {
  const responses: Record<string, string> = {
    explain: `Great question! This relates to a core concept in building LLMs. The key idea is that transformers process text by breaking it into tokens, computing attention scores between all pairs, and using those scores to build context-aware representations.\n\nTo fully understand this, I'd recommend working through the code exercises in this lecture. Try modifying the parameters and see how the output changes — that hands-on experience is invaluable.\n\n(Note: Connect a Gemini API key in your .env file to enable full AI tutor responses.)`,
    debug: `Let me help you debug that! Here are a few things to check:\n\n1. Make sure your tensor shapes match — this is the most common error in LLM code\n2. Check that your attention mask is applied correctly\n3. Verify your learning rate isn't too high\n\nTry adding some print statements to inspect intermediate values. If you share the specific error message, I can give more targeted help.\n\n(Note: Connect a Gemini API key in your .env file to enable full AI tutor responses.)`,
    build: `Here's a step-by-step approach to build this:\n\n1. Start with the data pipeline — tokenization and batching\n2. Build the model architecture piece by piece, testing each component\n3. Set up the training loop with proper logging\n4. Evaluate and iterate\n\nThe key is to start small and gradually increase complexity. Begin with a tiny dataset and model to verify everything works, then scale up.\n\n(Note: Connect a Gemini API key in your .env file to enable full AI tutor responses.)`,
  };
  return responses[mode] || responses.explain;
}
