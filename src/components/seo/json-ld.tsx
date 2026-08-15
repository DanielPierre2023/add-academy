/**
 * W4.4 — JSON-LD structured data.
 *
 * Renders a `<script type="application/ld+json">` tag with schema.org data so
 * search engines can show rich results (course cards, breadcrumbs, org logo).
 * This is a server component (no client JS shipped) and purely additive — it
 * changes nothing about the rendered UI.
 *
 * The JSON is escaped so a `<` inside any string value can never close the
 * <script> element early (`</script>` breakout / XSS via injected content).
 */

type JsonLdData = Record<string, unknown> | Array<Record<string, unknown>>;

function serialize(data: JsonLdData): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
