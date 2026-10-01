"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { BOOK_ASSETS } from "@/content/book2/assets/manifest";
import { loadCanonicalPage } from "@/content/book2/pages/load-page";
import type {
  CanonicalPage,
  InlineContent,
  PageBlock,
  PageLoadResult,
  TableCell,
} from "@/content/book2/schema";

type CanonicalPageSurfaceProps = {
  canonicalIndex: number;
  width: number;
  zoom: number;
};

export function CanonicalPageSurface({ canonicalIndex, width, zoom }: CanonicalPageSurfaceProps) {
  const [loadedPage, setLoadedPage] = useState<{
    canonicalIndex: number;
    result: PageLoadResult;
  } | null>(null);
  const result: PageLoadResult =
    loadedPage?.canonicalIndex === canonicalIndex ? loadedPage.result : { status: "not-imported" };
  const height = (width * 297) / 210;

  useEffect(() => {
    let active = true;
    void loadCanonicalPage(canonicalIndex).then((next) => {
      if (active) setLoadedPage({ canonicalIndex, result: next });
    });
    return () => {
      active = false;
    };
  }, [canonicalIndex]);

  return (
    <div
      className="page-slot"
      style={{ width: width * zoom, height: height * zoom }}
      data-canonical-index={canonicalIndex}
      role="group"
      aria-label={`Canonical page ${canonicalIndex}`}
    >
      <article
        className="canonical-page"
        style={{ width, height, transform: `translateX(-50%) scale(${zoom})` }}
        aria-label={
          result.status === "loaded"
            ? `Book page ${canonicalIndex}`
            : `Page ${canonicalIndex} unavailable`
        }
      >
        {result.status === "loaded" ? (
          <PageContent page={result.page} />
        ) : (
          <PageUnavailable state={result.status} canonicalIndex={canonicalIndex} />
        )}
      </article>
    </div>
  );
}

function PageUnavailable({
  state,
  canonicalIndex,
}: {
  state: PageLoadResult["status"];
  canonicalIndex: number;
}) {
  const message =
    state === "failed"
      ? "This page record could not be loaded. Try again later."
      : state === "invalid-index"
        ? "This page number is not valid."
        : "This canonical page has not been imported from a verified Word master yet.";

  return (
    <div className="page-unavailable" role="status">
      <span className="page-unavailable-mark" aria-hidden="true">
        B2
      </span>
      <p className="page-unavailable-kicker">Canonical page {canonicalIndex}</p>
      <h2>Page content is not available yet</h2>
      <p>{message}</p>
      <p className="page-unavailable-footnote">
        The printed page label and source mapping will appear after Word import.
      </p>
    </div>
  );
}

function PageContent({ page }: { page: CanonicalPage }) {
  return (
    <div className="page-content" aria-label={`Textbook page ${page.canonicalIndex}`}>
      {page.blocks.map((block) => (
        <PageBlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

function PageBlockView({ block }: { block: PageBlock }) {
  const positionStyle = block.layout
    ? {
        position: "absolute" as const,
        left: `${block.layout.x}%`,
        top: `${block.layout.y}%`,
        width: `${block.layout.width}%`,
        minHeight: `${block.layout.height}%`,
        zIndex: block.layout.zIndex,
      }
    : undefined;

  switch (block.type) {
    case "text":
    case "paragraph":
    case "rich-text":
    case "caption":
      return (
        <p className={`page-block page-block-${block.type}`} style={positionStyle}>
          <InlineView content={block.content} />
        </p>
      );
    case "heading": {
      const children = <InlineView content={block.content} />;
      if (block.level === 1)
        return (
          <h1 className="page-block" style={positionStyle}>
            {children}
          </h1>
        );
      if (block.level === 2)
        return (
          <h2 className="page-block" style={positionStyle}>
            {children}
          </h2>
        );
      if (block.level === 3)
        return (
          <h3 className="page-block" style={positionStyle}>
            {children}
          </h3>
        );
      if (block.level === 4)
        return (
          <h4 className="page-block" style={positionStyle}>
            {children}
          </h4>
        );
      if (block.level === 5)
        return (
          <h5 className="page-block" style={positionStyle}>
            {children}
          </h5>
        );
      return (
        <h6 className="page-block" style={positionStyle}>
          {children}
        </h6>
      );
    }
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className="page-block" style={positionStyle}>
          {block.items.map((item, index) => (
            <li key={index}>
              <InlineView content={item} />
            </li>
          ))}
        </List>
      );
    }
    case "table":
      return (
        <table className="page-block page-table" style={positionStyle}>
          {block.caption && <caption>{block.caption}</caption>}
          {block.columnWidths && (
            <colgroup>
              {block.columnWidths.map((width, index) => (
                <col key={index} style={{ width: `${width}%` }} />
              ))}
            </colgroup>
          )}
          {block.headers && (
            <thead>
              <tr>
                {block.headers.map((cell) => (
                  <TableCellView key={cell.id} cell={cell} header />
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell) => (
                  <TableCellView key={cell.id} cell={cell} header={cell.header} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "figure": {
      const asset = BOOK_ASSETS[block.assetId];
      return (
        <figure className="page-block page-figure" style={positionStyle}>
          {asset ? (
            <Image
              src={assetPath(asset.path)}
              alt={block.alt || asset.alt}
              width={asset.widthPx}
              height={asset.heightPx}
              sizes="(max-width: 900px) 100vw, 794px"
            />
          ) : (
            <MissingAsset assetId={block.assetId} />
          )}
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    }
    case "image": {
      const asset = BOOK_ASSETS[block.assetId];
      return asset ? (
        <Image
          className="page-block page-image"
          style={positionStyle}
          src={assetPath(asset.path)}
          alt={block.decorative ? "" : block.alt || asset.alt}
          width={asset.widthPx}
          height={asset.heightPx}
          sizes="(max-width: 900px) 100vw, 794px"
        />
      ) : (
        <span className="page-block page-missing-asset" style={positionStyle}>
          <MissingAsset assetId={block.assetId} />
        </span>
      );
    }
    case "equation":
      return (
        <div
          className="page-block page-equation"
          style={positionStyle}
          role="math"
          aria-label={block.accessibleText}
        >
          {block.accessibleText}
        </div>
      );
    case "shape":
      return (
        <div
          className={`page-block page-shape page-shape-${block.shape}`}
          style={{
            ...positionStyle,
            backgroundColor: block.fill,
            borderColor: block.stroke,
            borderWidth: block.strokeWidthPt,
            borderStyle: block.stroke ? "solid" : undefined,
          }}
          aria-label={block.label}
        />
      );
    case "callout":
    case "shaded-box":
      return (
        <aside
          className={`page-block page-box page-box-${block.type}`}
          style={{ ...positionStyle, backgroundColor: block.fill, borderColor: block.border }}
          aria-label={block.label}
        >
          {block.blocks.map((child) => (
            <PageBlockView key={child.id} block={child} />
          ))}
        </aside>
      );
    case "mcq":
      return (
        <section className="page-block page-mcq" style={positionStyle}>
          <div>
            {block.stem.map((child) => (
              <PageBlockView key={child.id} block={child} />
            ))}
          </div>
          <ol type="A">
            {block.options.map((option) => (
              <li key={option.id}>
                <InlineView content={option.content} />
              </li>
            ))}
          </ol>
        </section>
      );
    case "vertical-text":
      return (
        <p
          className="page-block page-vertical-text"
          style={{ ...positionStyle, writingMode: block.direction }}
        >
          <InlineView content={block.content} />
        </p>
      );
    case "columns":
      return (
        <div
          className="page-block page-columns"
          style={{ ...positionStyle, columnGap: block.gapPt }}
        >
          {block.columns.map((column, index) => (
            <div className="page-column" key={index}>
              {column.map((child) => (
                <PageBlockView key={child.id} block={child} />
              ))}
            </div>
          ))}
        </div>
      );
    case "page-number":
      return (
        <span className="page-block page-folio" style={positionStyle}>
          {block.printedPageLabel ?? block.canonicalIndex}
        </span>
      );
    case "footnote":
      return (
        <aside className="page-block page-footnote" style={positionStyle}>
          <sup>{block.marker}</sup> <InlineView content={block.content} />
        </aside>
      );
  }
}

function TableCellView({ cell, header }: { cell: TableCell; header?: boolean }) {
  const Tag = header || cell.header ? "th" : "td";
  const borders = cell.borders
    ? Object.fromEntries(
        Object.entries(cell.borders).map(([side, border]) => [
          `border${side[0].toUpperCase()}${side.slice(1)}`,
          `${border.widthPt}pt ${border.style} ${border.color}`,
        ]),
      )
    : {};
  return (
    <Tag
      colSpan={cell.columnSpan}
      rowSpan={cell.rowSpan}
      scope={Tag === "th" ? "col" : undefined}
      style={{
        backgroundColor: cell.fill,
        textAlign: cell.alignment,
        width: cell.widthPercent ? `${cell.widthPercent}%` : undefined,
        ...borders,
      }}
    >
      {cell.blocks.map((block) => (
        <PageBlockView key={block.id} block={block} />
      ))}
    </Tag>
  );
}

function InlineView({ content }: { content: InlineContent[] }) {
  return (
    <>
      {content.map((item, index) => {
        if (item.type === "break") return <br key={index} />;
        if (item.type === "link")
          return (
            <a key={index} href={item.href}>
              <InlineView content={item.children} />
            </a>
          );
        let node: ReactNode = item.text;
        for (const mark of item.marks ?? []) {
          if (mark === "bold") node = <strong key={mark}>{node}</strong>;
          if (mark === "italic") node = <em key={mark}>{node}</em>;
          if (mark === "underline") node = <u key={mark}>{node}</u>;
          if (mark === "superscript") node = <sup key={mark}>{node}</sup>;
          if (mark === "subscript") node = <sub key={mark}>{node}</sub>;
        }
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}

function MissingAsset({ assetId }: { assetId: string }) {
  return (
    <span className="page-missing-asset" role="img" aria-label="Figure asset unavailable">
      Figure asset unavailable ({assetId})
    </span>
  );
}

function assetPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}
