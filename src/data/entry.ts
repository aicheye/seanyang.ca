/** One page of an entry dialog: an optional demo image plus the blurb shown
    under it. A page with no `media` shows the pager row and its blurb alone. */
export interface EntryPage {
  /** Demo gif/image shown in the dialog. */
  media?: string
  /** Short label shown in the pager row. */
  caption?: string
  /** Blurb for this page, one sentence per entry; falls back to the entry's `description`. */
  text?: string[]
}
