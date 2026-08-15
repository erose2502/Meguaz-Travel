// Served in place of any hashed bundle that no longer exists on this server.
// Receiving this file means the page that requested it is a stale cached
// shell — reload once so the browser revalidates and pulls the current shell
// instead of sitting on a blank page. The sessionStorage flag guards against
// a reload loop if the fresh shell's own bundle is ever momentarily missing.
if (!sessionStorage.getItem('mg-stub-reload')) {
  sessionStorage.setItem('mg-stub-reload', '1')
  location.reload()
}
