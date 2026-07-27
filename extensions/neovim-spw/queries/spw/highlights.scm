;; queries/spw/highlights.scm — Tree-sitter highlight rules for Spw language
;; Defines operator-physics, container, sigil, and valence highlight captures.

;; Spirit-Phase directives
((line_comment) @keyword.directive
  (#match? @keyword.directive "^#![a-z_]+"))

;; Comments
(line_comment) @comment

;; Sigils & Operators
[
  "^"
  "~"
  "&"
  "!"
  "%"
  "$"
  "?"
  "#"
  "@"
] @operator

;; Containers & Brackets
[
  "{"
  "}"
  "["
  "]"
  "("
  ")"
] @punctuation.bracket

;; Strings & References
(string) @string
(reference) @string.special.path

;; Anchors, Labels & Tags
(anchor) @label
(tag) @attribute
(root_alias) @type

;; Readings & Appositions
(reading) @comment.documentation
