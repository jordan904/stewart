Read @brief.md and @CLAUDE.md then build this website following these rules:

DESIGN SYSTEM:
- Use 21st.dev Magic MCP for all UI components
- Type /ui [component description] to generate each section
- Generate these sections using Magic:
  /ui hero section for [business type] with headline, subheadline, and CTA button
  /ui services grid showing [services from brief]
  /ui contact section with phone, email, address
  /ui navigation bar with business name and logo
  /ui footer with contact info and social links
  /ui testimonials section with star ratings (use Google Maps reviews from brief if available)

PHOTOS:
- Use photos from assets/photos/ folder
- Hero section: use the best quality photo as background or feature image
- Gallery section: use remaining photos
- If no photos available use placeholder divs with the business brand color

CONTENT:
- All text comes from brief.md
- Use the exact business name, phone, address from the brief
- If Google Maps rating exists add it prominently: '★ [X]/5 — Rated by [N] customers'
- Use review highlights as testimonials

STYLE:
- Mobile first responsive design
- Brand color extracted from brief.md
- Fast loading — vanilla HTML/CSS/JS
- No heavy frameworks unless brief specifies
- Professional contractor website aesthetic

DESIGN INTELLIGENCE:
A ui-ux-pro-max design system has been installed in this project. Use it to search for the best color palettes, font pairings, and UI styles:

python3 .claude/skills/ui-ux-pro-max/scripts/search.py "contractor trades professional" --design-system

Run this search first before building to get the recommended design system for this project.

QUALITY BAR:
- Every section must look professional
- No placeholder text anywhere
- All links must work
- Contact form must have name, phone, message fields
- Do not stop until the site looks complete
- Iterate and improve until done

Do not ask questions. Build from the brief. Use Magic for every UI component. Iterate until the site is complete and professional.