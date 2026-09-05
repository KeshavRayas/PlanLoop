"use client";

import { useMemo } from "react";

function latexToHtml(source: string): string {
  let html = source;

  // 1. Strip comments (but not \\% escaped percent)
  html = html.replace(/(?<!\\)%.*/g, "");

  // 2. Strip preamble
  html = html.replace(/\\documentclass\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g, "");
  html = html.replace(/\\usepackage\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g, "");
  html = html.replace(
    /\\(?:newcommand|renewcommand)\s*(?:\\[a-zA-Z]+)\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g,
    "",
  );
  html = html.replace(/\\geometry\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g, "");
  html = html.replace(/\\setlength\s*\{[^}]*\}\s*\{[^}]*\}/g, "");

  // 3. Extract content between document environment
  const docMatch = html.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (docMatch) html = docMatch[1];

  // 4. Handle known formatting environments (before generic env stripping)
  html = html.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    '<div class="latex-center">$1</div>',
  );
  html = html.replace(
    /\\begin\{flushleft\}([\s\S]*?)\\end\{flushleft\}/g,
    '<div class="latex-left">$1</div>',
  );
  html = html.replace(
    /\\begin\{flushright\}([\s\S]*?)\\end\{flushright\}/g,
    '<div class="latex-right">$1</div>',
  );

  // 5. Handle envs with nested-brace args (e.g., \begin{tabular}{>{\small}l X})
  //     The generic stripper (step 6) can't handle nested { } inside env args.
  html = html.replace(
    /\\begin\{([^}]*)\}(?:\[[^\]]*\])?\s*\{[^}]*\{[^}]*\}[^}]*\}([\s\S]*?)\\end\{\1\}/g,
    "$2",
  );

  // 6. Strip generic begin/end blocks, keep inner content
  html = html.replace(
    /\\begin\{[^}]*\}(?:\[[^\]]*\])?(?:\{[^}]*\})?([\s\S]*?)\\end\{[^}]*\}/g,
    "$1",
  );

  // 7. Handle \\[10pt] line-break spacing (run before \\→newline so \\[10pt] is matched as a unit)
  html = html.replace(/(?:\\{1,2}\[\d+\.?\d*pt\s*\]?\s*)+/g, "<br/>");

  // 8. Convert \\ to newlines
  html = html.replace(/\\\\/g, "\n");

  // 9. Handle tabular
  html = html.replace(/\\\|/g, "|");
  html = html.replace(/\s*&\s*/g, " • ");
  html = html.replace(/(?:\|[lcr])+\|?/g, "");

  // 10. Escaped special chars
  html = html.replace(/\\([%&$_#{}])/g, "$1");

  // 11. Formatting commands
  html = html.replace(/\\(?:textbf|textbf)\{([^}]*)\}/g, "<b>$1</b>");
  html = html.replace(/\\(?:textit|emph)\{([^}]*)\}/g, "<i>$1</i>");
  html = html.replace(/\\(?:underline|uline)\{([^}]*)\}/g, "<u>$1</u>");
  html = html.replace(/\\(?:texttt|code)\{([^}]*)\}/g, "<code>$1</code>");

  // 12. Section headings
  html = html.replace(
    /\\(?:part|chapter|section|subsection|subsubsection|section\*|subsection\*|subsubsection\*|cvsection|cvsubsection|sectionstyle|sectionStyle|sectiontitle|sectionTitle|resumesection|headingsection|headingstyle|sectionHeader|sectionheader)\{([^}]*)\}/g,
    "</p><h2 class='latex-h2'>$1</h2><p>",
  );

  // 13. Lists
  html = html.replace(/\\item\s*/g, "</li>\n<li>");
  html = html.replace(/\\begin\{itemize\}/g, "</p>\n<ul>\n<li>");
  html = html.replace(/\\end\{itemize\}/g, "</li>\n</ul>\n<p>");
  html = html.replace(/\\begin\{enumerate\}/g, "</p>\n<ol>\n<li>");
  html = html.replace(/\\end\{enumerate\}/g, "</li>\n</ol>\n<p>");

  // 14. Math mode
  html = html.replace(
    /\\\[([\s\S]*?)\\\]/g,
    "<span class='latex-math'>[$1]</span>",
  );
  html = html.replace(
    /\$\$([\s\S]*?)\$\$/g,
    "<span class='latex-math'>[$1]</span>",
  );
  html = html.replace(/\$([^$\n]*?)\$/g, "<span class='latex-math'>$1</span>");

  // 15. Additional text formatting commands (before generic stripping eats content)
  html = html.replace(
    /\\(?:textsf)\{([^}]*)\}/g,
    '<span style="font-family:sans-serif">$1</span>',
  );
  html = html.replace(
    /\\(?:textrm)\{([^}]*)\}/g,
    '<span style="font-family:serif">$1</span>',
  );
  html = html.replace(
    /\\(?:textsc)\{([^}]*)\}/g,
    '<span class="latex-sc">$1</span>',
  );

  // 16. Braced font size: {\Large text} patterns (run before stray braces removal)
  html = html.replace(
    /\{\s*\\(?:Huge|huge|LARGE)\s*([\s\S]*?)\s*\}/g,
    '<span class="latex-xxl">$1</span>',
  );
  html = html.replace(
    /\{\s*\\(?:Large)\s*([\s\S]*?)\s*\}/g,
    '<span class="latex-xl">$1</span>',
  );
  html = html.replace(
    /\{\s*\\(?:large)\s*([\s\S]*?)\s*\}/g,
    '<span class="latex-lg">$1</span>',
  );
  html = html.replace(
    /\{\s*\\(?:small|footnotesize|tiny)\s*([\s\S]*?)\s*\}/g,
    '<span class="latex-sm">$1</span>',
  );

  // 17. Strip bare font switch commands (before generic command stripping)
  html = html.replace(
    /\\(?:Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny)/g,
    "",
  );
  html = html.replace(
    /\\(?:sffamily|rmfamily|ttfamily|mdseries|bfseries|upshape|itshape|slshape|scshape|centering)/g,
    "",
  );

  // 18. Custom spacing: collapse chains of \*{-Npt} / \*-Npt / *-Npt to section breaks
  html = html.replace(
    /(?:\\?\*\{?\s*-?\d+\.?\d*pt\s*\}?\s*)+/g,
    "</p><hr class='latex-hr'/><p>",
  );
  html = html.replace(/(?:\\-?\d+\.?\d*pt\s*)+/g, "<br/>");

  // 19. Strip =NUMBERunit patterns (like =10in, =6pt)
  html = html.replace(
    /=\d+(?:\.\d+)?(?:in|pt|cm|mm|em|ex|pc|bp|dd|cc|sp)?\s*/g,
    "",
  );

  // 20. Strip [NUMBER] artifacts anywhere
  html = html.replace(/\[\d+\]\s*/g, "");

  // 21. Strip #N parameter references
  html = html.replace(/#\d+/g, "");

  // 22. Handle LaTeX spacing commands (\;, \,, \:, \!, \ ) before generic stripper
  html = html.replace(/(?:\\[ ;,:!])/g, " ");

  // 23. Strip remaining generic LaTeX commands with args
  html = html.replace(/\\[a-zA-Z]+(\[[^\]]*\])?(\{[^}]*\})?/g, "");
  html = html.replace(/\\[a-zA-Z]+/g, "");

  // 24. Remove stray braces
  html = html.replace(/[\{\}]/g, "");

  // 25. Ligatures
  html = html.replace(/~/g, " ");
  html = html.replace(/---/g, "—");
  html = html.replace(/--/g, "–");

  // 26. URLs to links
  html = html.replace(
    /(https?:\/\/[^\s<>]+)/g,
    "<a href='$1' target='_blank' rel='noopener noreferrer' class='latex-link'>$1</a>",
  );

  // 27. Collapse whitespace
  html = html.replace(/\n{4,}/g, "\n\n\n");
  html = html.replace(/[ \t]+/g, " ");
  html = html.replace(/\s*<hr\s+\/>\s*/g, "<hr/>");
  html = html.replace(/\s*<br\s*\/>\s*/g, "<br/>");
  html = html.replace(/(<hr\/>)\s*(<hr\/>)+/g, "<hr/>");
  html = html.replace(/\n\s*<hr\/>\s*\n/g, "<hr/>");
  html = html.trim();

  // 28. Wrap text paragraphs (skip already-wrapped HTML elements)
  const blocks = html
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  const wrapped = blocks.map((block) => {
    if (/^<\w+/.test(block)) return block;
    return `<p>${block}</p>`;
  });

  return wrapped.join("\n");
}

export function LatexPreview({ source }: { source: string }) {
  const html = useMemo(() => latexToHtml(source), [source]);

  return (
    <div
      className="latex-preview h-full overflow-y-auto custom-scrollbar p-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
