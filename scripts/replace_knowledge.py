import re

path = r'C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro\public\tenant-app.html'
content = open(path, encoding='utf-8').read()

new_fn = r"""    async function viewKnowledge() {
      document.getElementById('view').innerHTML = wrapPage('Knowledge', 'FAQ knowledge base.', '<div class="wb-banner">Loading...</div>');

      var products = [];
      var entries = [];
      var apiNote = '';

      try {
        var pr = await api(base() + '/products');
        products = Array.isArray(pr.products) ? pr.products : [];
      } catch (_) {}

      try {
        var k = await api(base() + '/knowledge');
        entries = Array.isArray(k.entries) ? k.entries.map(function(e, i) { return normalizeKnowledgeEntry(e, i); }) : [];
      } catch (e) {
        apiNote = 'Knowledge unavailable: ' + e.message;
      }

      var state = {
        entries: entries,
        products: products,
        filters: { product: 'all', language: 'all' },
        panel: null,
        saving: false,
        apiNote: apiNote,
      };

      function filtered() {
        return state.entries.filter(function(e) {
          if (state.filters.language !== 'all' && e.language.toLowerCase() !== state.filters.language) return false;
          if (state.filters.product !== 'all' && e.category !== state.filters.product) return false;
          return true;
        });
      }

      function productName(cat) {
        var p = state.products.find(function(p) { return p.id === cat || p.name === cat; });
        return p ? p.name : (cat || 'general');
      }

      function renderPanel() {
        if (!state.panel) return '';
        var isEdit = state.panel.mode === 'edit';
        var e = state.panel.entry || {};
        var prodOpts = '<option value="">\u2014 No product \u2014</option>' +
          state.products.map(function(p) {
            return '<option value="' + esc(p.name) + '"' + (e.category === p.name ? ' selected' : '') + '>' + esc(p.name) + '</option>';
          }).join('');
        var langOpts = ['en','zh','vi'].map(function(l) {
          return '<option value="' + l + '"' + (e.language === l ? ' selected' : '') + '>' + l.toUpperCase() + '</option>';
        }).join('');
        return '<div class="kn-panel-overlay" id="knPanelOverlay">' +
          '<div class="kn-panel">' +
          '<div class="kn-panel-head"><h3>' + (isEdit ? 'Edit FAQ' : 'New FAQ') + '</h3>' +
          '<button type="button" class="icon-btn" id="knPanelClose">\u2715</button></div>' +
          '<div class="kn-panel-body">' +
          '<div><label class="legacy">Product</label><select class="legacy" id="kpProduct" style="width:100%">' + prodOpts + '</select></div>' +
          '<div><label class="legacy">Language</label><select class="legacy" id="kpLanguage" style="width:100%">' + langOpts + '</select></div>' +
          '<div><label class="legacy">Question</label><input class="legacy" type="text" id="kpQuestion" value="' + esc(e.title || '') + '" style="width:100%" placeholder="Enter question" /></div>' +
          '<div><label class="legacy">Answer</label><textarea class="legacy" id="kpAnswer" rows="8" style="width:100%;resize:vertical">' + esc(e.content || '') + '</textarea></div>' +
          '</div>' +
          '<div class="kn-panel-actions">' +
          '<button type="button" class="btn btn-primary" id="knPanelSave">' + (state.saving ? 'Saving\u2026' : 'Save') + '</button>' +
          '<button type="button" class="btn" id="knPanelCancel">Cancel</button>' +
          '</div></div></div>';
      }

      function mount() {
        var list = filtered();
        var rowsHtml = '';
        if (!state.entries.length) {
          rowsHtml = '<div class="kn-empty wb-empty"><strong>No FAQ entries yet.</strong><br/>Click "+ New FAQ" to create the first one.<br/><a class="btn" href="/app/settings/products" data-spa="/app/settings/products" style="margin-top:0.75rem">Manage Products first</a></div>';
        } else if (!list.length) {
          rowsHtml = '<div class="kn-empty wb-empty"><strong>No results.</strong> Try changing the filters.</div>';
        } else {
          rowsHtml = list.map(function(e) {
            var isOn = e.status === 'published';
            return '<div class="kn-faq-row">' +
              '<div class="kn-faq-row-info">' +
              '<p class="kn-faq-row-q">' + esc(e.title) + '</p>' +
              '<div class="kn-faq-row-tags">' +
              (e.category ? '<span class="kn-chip wb-chip">' + esc(productName(e.category)) + '</span>' : '') +
              '<span class="kn-chip wb-chip">' + esc(e.language.toUpperCase()) + '</span>' +
              '</div></div>' +
              '<div class="kn-faq-row-actions">' +
              '<button type="button" class="kn-toggle' + (isOn ? ' on' : '') + '" title="' + (isOn ? 'Disable' : 'Enable') + '" data-kn-toggle="' + esc(e.id) + '" data-kn-active="' + (isOn ? '1' : '0') + '"></button>' +
              '<button type="button" class="icon-btn" title="Edit" data-kn-edit="' + esc(e.id) + '">\u270e</button>' +
              '<button type="button" class="icon-btn" title="Delete" data-kn-del="' + esc(e.id) + '">\u2715</button>' +
              '</div></div>';
          }).join('');
        }

        var prodFilterOpts = '<option value="all">All products</option>' +
          state.products.map(function(p) {
            return '<option value="' + esc(p.name) + '"' + (state.filters.product === p.name ? ' selected' : '') + '>' + esc(p.name) + '</option>';
          }).join('');
        var langFilterOpts =
          '<option value="all"' + (state.filters.language === 'all' ? ' selected' : '') + '>All languages</option>' +
          ['en','zh','vi'].map(function(l) {
            return '<option value="' + l + '"' + (state.filters.language === l ? ' selected' : '') + '>' + l.toUpperCase() + '</option>';
          }).join('');

        document.getElementById('view').innerHTML = wrapPage(
          'Knowledge',
          'FAQ knowledge base.',
          (state.apiNote ? '<div class="wb-banner">' + esc(state.apiNote) + '</div>' : '') +
          '<div class="kn-page">' +
          '<div class="kn-toolbar wb-toolbar" style="margin-bottom:0.75rem">' +
          '<div class="fld"><label>Product</label><select class="legacy" id="knProdFilter">' + prodFilterOpts + '</select></div>' +
          '<div class="fld"><label>Language</label><select class="legacy" id="knLangFilter">' + langFilterOpts + '</select></div>' +
          '<div class="wb-toolbar-actions"><button type="button" class="btn btn-primary" id="knNewBtn">+ New FAQ</button>' +
          '<a class="btn" href="/app/settings/products" data-spa="/app/settings/products">Manage products</a></div>' +
          '</div>' +
          '<div style="border:1px solid var(--border);border-radius:var(--radius,6px);min-height:300px;">' +
          '<div style="padding:0.5rem 0.85rem;border-bottom:1px solid var(--border);font-size:0.8rem;color:var(--muted)">FAQ entries \xb7 ' + list.length + ' shown</div>' +
          rowsHtml +
          '</div></div>' +
          renderPanel()
        );
        bindSpaLinks(document.getElementById('view'));

        var pf = document.getElementById('knProdFilter');
        if (pf) pf.onchange = function(ev) { state.filters.product = ev.target.value; mount(); };
        var lf = document.getElementById('knLangFilter');
        if (lf) lf.onchange = function(ev) { state.filters.language = ev.target.value; mount(); };

        var nb = document.getElementById('knNewBtn');
        if (nb) nb.onclick = function() { state.panel = { mode: 'create', entry: { language: 'en' } }; mount(); };

        document.querySelectorAll('[data-kn-toggle]').forEach(function(btn) {
          btn.onclick = async function() {
            var id = btn.getAttribute('data-kn-toggle');
            var isActive = btn.getAttribute('data-kn-active') === '1';
            try {
              await api(base() + '/knowledge/' + encodeURIComponent(id) + (isActive ? '/disable' : '/enable'), { method: 'POST', body: '{}' });
              state.entries = state.entries.map(function(e) {
                return e.id === id ? Object.assign({}, e, { status: isActive ? 'draft' : 'published' }) : e;
              });
              mount();
            } catch (e) { alert('Toggle failed: ' + e.message); }
          };
        });

        document.querySelectorAll('[data-kn-edit]').forEach(function(btn) {
          btn.onclick = function() {
            var id = btn.getAttribute('data-kn-edit');
            var entry = state.entries.find(function(e) { return e.id === id; });
            if (entry) { state.panel = { mode: 'edit', entry: entry }; mount(); }
          };
        });

        document.querySelectorAll('[data-kn-del]').forEach(function(btn) {
          btn.onclick = async function() {
            var id = btn.getAttribute('data-kn-del');
            var entry = state.entries.find(function(e) { return e.id === id; });
            if (!confirm('Delete "' + (entry ? entry.title : id) + '"?')) return;
            try {
              await api(base() + '/knowledge/' + encodeURIComponent(id) + '/disable', { method: 'POST', body: '{}' });
              state.entries = state.entries.filter(function(e) { return e.id !== id; });
              mount();
            } catch (e) { alert('Delete failed: ' + e.message); }
          };
        });

        var overlay = document.getElementById('knPanelOverlay');
        var closeBtn = document.getElementById('knPanelClose');
        var cancelBtn = document.getElementById('knPanelCancel');
        function closeFn() { state.panel = null; mount(); }
        if (overlay) overlay.onclick = function(ev) { if (ev.target === overlay) closeFn(); };
        if (closeBtn) closeBtn.onclick = closeFn;
        if (cancelBtn) cancelBtn.onclick = closeFn;

        var saveBtn = document.getElementById('knPanelSave');
        if (saveBtn) {
          saveBtn.onclick = async function() {
            var question = (document.getElementById('kpQuestion').value || '').trim();
            var answer = (document.getElementById('kpAnswer').value || '').trim();
            var product = document.getElementById('kpProduct').value || '';
            var language = document.getElementById('kpLanguage').value || 'en';
            if (!question || !answer) { alert('Question and answer are required.'); return; }
            state.saving = true;
            mount();
            try {
              var payload = JSON.stringify({ language: language, category: product || 'general', question: question, answer: answer, source_type: 'manual', is_active: false });
              if (state.panel && state.panel.mode === 'create') {
                await api(base() + '/knowledge', { method: 'POST', body: payload });
                var k2 = await api(base() + '/knowledge');
                state.entries = Array.isArray(k2.entries) ? k2.entries.map(function(e, i) { return normalizeKnowledgeEntry(e, i); }) : state.entries;
              } else if (state.panel) {
                var eid = state.panel.entry.id;
                await api(base() + '/knowledge/' + encodeURIComponent(eid), { method: 'PUT', body: payload });
                var k3 = await api(base() + '/knowledge');
                state.entries = Array.isArray(k3.entries) ? k3.entries.map(function(e, i) { return normalizeKnowledgeEntry(e, i); }) : state.entries;
              }
              state.panel = null;
            } catch (e) {
              alert('Save failed: ' + e.message);
            }
            state.saving = false;
            mount();
          };
        }
      }
      mount();
    }

"""

start = content.find('    async function viewKnowledge() {')
end = content.find('    async function viewTeam() {')
new_content = content[:start] + new_fn + content[end:]
open(path, 'w', encoding='utf-8').write(new_content)
print('Done. New file length:', len(new_content))
