# Civil Engineer Sitemap CDN

Reusable HTML sitemap assets for Blogger-based websites.

This repository contains the source files, Blogger HTML templates, and
minified assets used by the TITOREISTA sitemap. The published JavaScript
bundle is currently configured for `https://www.titoreista.com`.

## Current configuration

- Example site: TITOREISTA
- Site origin in the published bundle: `https://www.titoreista.com`
- Platform: Blogger
- Feed API: Blogger JSONP feeds
- Language of the published example: Indonesian
- CDN provider: Cloudflare Workers
- CDN hostname: `assets.titoreista.com`

The public bundle is not site-independent. Configure `HOME_PAGE` before
using the JavaScript bundle on another website.

## Public assets

- CSS: <https://assets.titoreista.com/sitemap/css/sitemap.min.css>
- JavaScript: <https://assets.titoreista.com/sitemap/js/sitemap.min.js>

Both URLs should return HTTP status `200`.

## Repository structure

```text
src/
├── css/
│   └── sitemap.css
└── js/
    └── sitemap.js

examples/
├── sitemap-template.html
└── sitemap-titoreista.html

dist/
└── sitemap/
    ├── css/
    │   └── sitemap.min.css
    └── js/
        └── sitemap.min.js
```

## Usage

1. Open `examples/sitemap-template.html` or
   `examples/sitemap-titoreista.html`.
2. Copy the HTML into a Blogger static page using HTML view.
3. Replace the site name, descriptive text, image, and image metadata.
4. Confirm that the JavaScript bundle is configured for the target site.
5. Publish the Blogger page and test the feed, category selector, search, and
   accordion controls.

The HTML template must keep these IDs because the JavaScript uses them:

```text
app-container
feed-container
feed-nav
result-desc
page-container
page-nav
page-desc
label-sorter
feed-q
post-searcher
action-btn
```

## Using another Blogger site

The source JavaScript contains:

```js
var HOME_PAGE = 'https://www.titoreista.com';
```

Replace it with the target site origin without a trailing slash:

```js
var HOME_PAGE = 'https://www.example.com';
```

After changing the domain:

1. Edit `src/js/sitemap.js`.
2. Generate a new minified JavaScript bundle.
3. Publish the configured bundle at a URL controlled by that site.
4. Update the HTML title, text, image, and descriptions.
5. Test article feeds, static pages, categories, search, and mobile layout.

Do not use the published TITOREISTA JavaScript bundle unchanged on another
site. Do not edit a minified file manually when the source file is available.

## Compatibility

This project is designed for:

- Blogger websites and Blogger static pages;
- Blogger feed endpoints accessible through JSONP;
- modern browsers with JavaScript enabled;
- templates that allow external CSS and JavaScript.

This is an HTML sitemap. It does not replace Blogger XML sitemaps,
`robots.txt`, canonical URL configuration, or Google Search Console
submission.

## Limitations

- Articles and static pages are loaded from Blogger feeds.
- Results depend on the availability and response of the Blogger feed.
- Search behavior depends on Blogger feed search support.
- Media counts may be incomplete when only summary content is available.
- JavaScript must be enabled in the visitor's browser.
- The configured site origin must match the target Blogger domain.

## Deployment

The live public assets are served by the `civil-engineer-assets` Cloudflare
Worker at `assets.titoreista.com`. The active deployment assets are mirrored
in the main CDN repository at:

```text
civil-engineer-cdn/dist/sitemap/
```

This repository is the dedicated source and documentation repository. Updating
files here does not automatically update the live Worker unless the matching
assets are also deployed through the main CDN deployment.

## Verification checklist

- CSS URL returns HTTP `200`.
- JavaScript URL returns HTTP `200`.
- Static pages load.
- Articles load.
- Categories populate.
- Valid searches return expected results.
- Short or punctuation-only searches are rejected.
- Accordion controls open and close.
- The page works on mobile screens.
- The browser console has no JavaScript errors.

## License

No license is currently included. Add a license before encouraging third-party
copying, modification, or redistribution.
