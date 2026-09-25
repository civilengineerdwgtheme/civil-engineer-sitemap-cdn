# Civil Engineer Sitemap CDN

Reusable HTML sitemap assets for Blogger-based websites.

This repository contains minified CSS and JavaScript assets used by the
TITOREISTA sitemap. The published JavaScript bundle is currently configured
for `https://www.titoreista.com`.

## Current configuration

- Site: TITOREISTA
- Site origin: `https://www.titoreista.com`
- Platform: Blogger
- Feed API: Blogger JSONP feeds
- Language: Indonesian
- CDN provider: Cloudflare Workers
- CDN hostname: `assets.titoreista.com`

## Public assets

- CSS: https://assets.titoreista.com/sitemap/css/sitemap.min.css
- JavaScript: https://assets.titoreista.com/sitemap/js/sitemap.min.js

Both assets should return HTTP status `200`.

## Repository structure

```text
dist/
└── sitemap/
    ├── css/
    │   └── sitemap.min.css
    └── js/
        └── sitemap.min.js
```

## Usage

Add the sitemap HTML to a Blogger static page using the HTML view.

The page must load the assets:

```html
<link rel="stylesheet" href="https://assets.titoreista.com/sitemap/css/sitemap.min.css">

<!-- Sitemap HTML markup -->

<script defer src="https://assets.titoreista.com/sitemap/js/sitemap.min.js"></script>
```

The HTML markup must provide the element IDs expected by the JavaScript:

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

The published JavaScript bundle is currently configured with:

```js
var HOME_PAGE = 'https://www.titoreista.com';
```

To use the sitemap on another Blogger site, replace the value with the target site origin without a trailing slash:

```js
var HOME_PAGE = 'https://www.example.com';
```

After changing the domain:

1. Update the source JavaScript.
2. Generate a new minified JavaScript bundle.
3. Publish the new bundle.
4. Update the HTML text, title, image, and descriptions for the new site.
5. Test the article feed, page feed, categories, and search.

Do not use the published TITOREISTA JavaScript bundle unchanged on another site.

## Compatibility

This sitemap is designed for:

- Blogger websites;
- Blogger static pages;
- Blogger feed endpoints accessible through JSONP;
- modern browsers with JavaScript enabled;
- templates that allow external CSS and JavaScript.

This project provides an HTML sitemap. It does not replace:

- Blogger XML sitemaps;
- `robots.txt`;
- Google Search Console submission;
- canonical URL configuration.

## Limitations

- Articles and static pages are loaded from Blogger feeds.
- Results depend on the availability and response of the Blogger feed.
- Search results depend on Blogger feed search behavior.
- Media counts may be incomplete when the feed provides summary content only.
- JavaScript must be enabled in the visitor's browser.
- The site origin must point to the correct Blogger domain.

## Deployment

The public assets are served through the `civil-engineer-assets` Cloudflare Worker
at:

```text
https://assets.titoreista.com
```

The active public paths are:

```text
/sitemap/css/sitemap.min.css
/sitemap/js/sitemap.min.js
```

The corresponding deployment assets are stored in:

```text
civil-engineer-cdn/dist/sitemap/
```

This repository is maintained as the dedicated sitemap asset repository.

## Verification checklist

Before publishing the sitemap, verify:

- CSS URL returns HTTP `200`.
- JavaScript URL returns HTTP `200`.
- Static pages are loaded.
- Articles are loaded.
- Categories are populated.
- Search works with meaningful terms.
- Search rejects invalid short queries.
- Accordion controls open and close.
- The page works on mobile screens.
- The browser console has no JavaScript errors.

## License

Add an appropriate license before encouraging third-party reuse.
