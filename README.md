# Business with Personal Finance — Book 2 Reader

A static-friendly, page-faithful textbook reader built with Next.js and TypeScript. The application is ready for verified Word page imports; no textbook page bodies have been imported yet.

## Run and validate

```powershell
npm ci
npm run dev
```

Before building a release:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run validate:reader
npm run build
```

`npm run build` writes a static site to `out/`. For a GitHub Pages project site, set `NEXT_PUBLIC_BASE_PATH` to the repository path at build time (for example, `/B2-Textbook-Website`). A custom-domain or root Pages site can leave it unset. The site has no runtime DOCX parser, paid service, database, or always-on server dependency.

## Current source state

The project files contain the implementation brief and a few exact contents titles, but not the complete contents/index listing or verified Word masters. `src/content/book2/contents/index.json` records only titles that were explicitly supplied and the example printed label `4` for Module 1.1; it marks the source partial. Missing titles, most labels, page mappings, page records, and export artifacts remain unresolved. Attach the authoritative contents listing to complete that dataset.

The canonical manifest is `public/book-data/B2/manifest.json`. It currently records a planning estimate of about 1,900 pages and an unresolved verified page count. Each imported page will receive a stable ID (`book2-page-0001`, etc.) independent of its printed page label. Canonical position links use the static-friendly query form `/read/?page=347`. Imported page modules are generated under `src/content/book2/pages/` and loaded through a small dynamic-import registry.

## Architecture decisions

1. Verified Word masters are the authoritative editable sources.
2. Canonical page identity is independent of the printed textbook label.
3. The website consumes generated page records; it never parses DOCX files at runtime.
4. Single-page, double-page, and virtualized infinite-scroll modes share one page record and renderer.
5. TOC titles come from the supplied contents listing and preserve its wording.
6. Printed labels stay in typed TOC/manifest data and are not displayed beside TOC titles.
7. Canonical page mappings remain null until Word import establishes them.
8. Full-page source images are not an acceptable final page representation; editable text remains HTML.
9. Downloads are built from canonical page-level Word and PDF export artifacts.
10. Theme changes affect application chrome; textbook page surfaces remain faithful to source colors.
11. Infinite scroll virtualizes nearby pages and retains estimated spacers for offscreen pages.
12. GitHub is the durable home for recoverable project sources and generated reader data.
13. Deployment uses static files compatible with free GitHub Pages hosting; the site does not fetch Git LFS objects.
14. A combined full-book DOCX is a generated export; verified Word batches remain recoverable inputs.

## Source and generated data layout

- `book.config.json` — book and part identity.
- `public/book-data/B2/manifest.json` — release identity, page manifest, source batch inventory, page count, and spread policy.
- `src/content/book2/contents/` — exact typed contents tree, including stored but visually hidden printed labels.
- `src/content/book2/pages/` — generated page modules and dynamic loader registry.
- `src/content/book2/assets/` — stable asset IDs and content-addressed generated asset references.
- `src/pipeline/word-import/` — parser/normalizer/generator/validator contracts; a verified DOCX parser is not implemented yet.
- `src/pipeline/validation/` — structural audit and visual comparison data contracts.
- `src/pipeline/exports/` — page packet and range assembly contracts.

The release manifest is published only after the page modules, assets, search records, and export artifacts it references have been generated and validated together. Each Word batch/page can be rebuilt incrementally; deployable page modules and assets use hashes and stable IDs to avoid mixed cache versions.
