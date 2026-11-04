# Personal Library

The guest Library has two independent memberships for both movies and series:
**Favorites** (saved titles) and **Watched**. A title can have either, both or
neither. Adding a Favorite never marks it Watched; marking Watched never adds a
Favorite. Removing one flag preserves the other. Card and detail-page actions
share the existing Zustand store, accessible pressed states and localStorage
persistence. No account, server storage, cloud sync or episode tracking is used.

`/library` opens Favorites. `?collection=favorites` and `?collection=watched`
select the two views through React Router. Legacy `?collection=watchlist` and
unknown collection values safely show Favorites. Movies and series retain
distinct `movie:id` / `tv:id` identities, including colliding numeric IDs.
Snapshots retain only identity, title, optional poster/year and memberships.

## Storage migration

The existing `movie-explorer.personal-library` key now stores schema version 2.
Version 1 used three independent boolean flags in one record per media identity:
Watchlist, Favorites and Watched. Watchlist represented saved titles; no separate
queue metadata or ordering existed. Migration sets
`favorites = old.favorites || old.watchlist` and preserves `watched` exactly.
Each identity remains one record; no new library or state-management layer is
introduced. Version 2 writes contain only Favorites and Watched flags.

Before the first migration write, the original JSON is retained verbatim under
`movie-explorer.personal-library.v1-backup`, including unknown/invalid records
that the existing runtime validator cannot restore. The backup is not removed
or overwritten by subsequent loads. Migration is idempotent, and reloading
version 2 never restores memberships a user has subsequently removed.

If the backup cannot be written, migration works in memory, preserves the
original active version 1 payload and blocks persistent writes with a visible
warning. If the version 2 write fails after backup, the original active data and
backup remain available and the existing persistence warning is shown. Storage
denial/quota failures retain in-memory functionality. Unknown schema versions
remain untouched and write-protected; they are not guessed or downgraded.

Favorites continue to seed homepage recommendations; both Favorites and Watched
are excluded from returned suggestions. Migrated saved titles therefore become
Favorites seeds naturally. Recommendations use IDs only, with separate movie
and series preferences; Library snapshots stay in the browser.
