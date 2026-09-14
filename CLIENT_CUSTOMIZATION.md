# Client Customization

1. Update verified business settings.
2. Upload the real logo, favicon and social preview image.
3. Add verified categories, products, variants, availability and images.
4. Configure the verified WhatsApp number.
5. Configure the verified Google Maps directions URL and only verified coordinates.
6. Configure actual opening hours and special closures.
7. Configure unique SEO title, description, site URL and OG image.
8. Replace sample reviews with verified customer feedback.
9. Set Supabase environment variables in Vercel, apply migrations and configure Auth/Storage RLS.
10. Run lint, typecheck, tests and production build before launch.

Never carry demo prices, testimonials, ratings, coordinates, awards, certifications or payment credentials into a real client deployment. Business settings are centralized so a new bakery can be rebranded without rewriting the core storefront. The database structure can later add a business_id tenant key cleanly.
