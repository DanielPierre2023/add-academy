import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPTS = {
  explain: `You are Alex, an AI tutor for the ADD Academy LLM course. You explain machine learning and LLM concepts clearly with examples. Be encouraging, patient, and use analogies. Keep responses concise (2-3 paragraphs max). If the student asks about a specific lecture topic, provide context from that lecture.`,
  debug: `You are Alex, an AI debugging assistant for the ADD Academy LLM course. Help students debug their Python code related to building LLMs. Ask clarifying questions, identify bugs, suggest fixes. Show corrected code when appropriate. Be supportive — debugging is a learning opportunity.`,
  build: `You are Alex, an AI project guide for the ADD Academy LLM course. Help students build practical AI projects step by step. Break down complex tasks into manageable steps. Suggest architectures, libraries, and best practices. Encourage experimentation.`,
};

export async function POST(request: NextRequest) {
  try {
    const { message, mode, lectureId, language, history } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback response when no API key is configured
      return NextResponse.json({
        response: getPlaceholderResponse(mode, message, language),
      });
    }

    const systemPrompt = SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.explain;
    const langContext = language !== 'en' ? `\nRespond in ${language === 'ro' ? 'Romanian' : 'Greek'} if the student writes in that language.` : '';
    const lectureContext = lectureId && lectureId !== 'home' ? `\nThe student is currently on Lecture ${lectureId}.` : '';

    const messages = [
      ...(history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt + langContext + lectureContext }] },
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('AI Tutor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getPlaceholderResponse(mode: string, message: string, language: string): string {
  const responses: Record<string, string> = {
    explain: `Great question! This relates to a core concept in building LLMs. The key idea is that transformers process text by breaking it into tokens, computing attention scores between all pairs, and using those scores to build context-aware representations.\n\nTo fully understand this, I'd recommend working through the code exercises in this lecture. Try modifying the parameters and see how the output changes — that hands-on experience is invaluable.\n\n(Note: Connect a Gemini API key in your .env file to enable full AI tutor responses.)`,
    debug: `Let me help you debug that! Here are a few things to check:\n\n1. Make sure your tensor shapes match — this is the most common error in LLM code\n2. Check that your attention mask is applied correctly\n3. Verify your learning rate isn't too high\n\nTry adding some print statements to inspect intermediate values. If you share the specific error message, I can give more targeted help.\n\n(Note: Connect a Gemini API key in your .env file to enable full AI tutor responses.)`,
    build: `Here's a step-by-step approach to build this:\n\n1. Start with the data pipeline — tokenization and batching\n2. Build the model architecture piece by piece, testing each component\n3. Set up the training loop with proper logging\n4. Evaluate and iterate\n\nThe key is to start small and gradually increase complexity. Begin with a tiny dataset and model to verify everything works, then scale up.\n\n(Note: Connect a Gemini API key in your .env file to enable full AI tutor responses.)`,
  };
  return responses[mode] || responses.explain;
}
