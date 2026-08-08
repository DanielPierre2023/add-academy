import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/school/dashboard'],
      },
    ],
    sitemap: 'https://academy.add-individual-solutions.com/sitemap.xml',
  };
}
