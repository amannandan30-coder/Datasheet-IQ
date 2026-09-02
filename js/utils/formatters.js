/* global namespace */
window.App = window.App || {};

/* ============================================================
   FORMATTERS — Currency, Weight, Numbers
   ============================================================ */
App.Fmt = (() => {
  const inrFmt = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    maximumFractionDigits: 0, minimumFractionDigits: 0
  });

  const numFmt = new Intl.NumberFormat('en-IN');

  function currency(val) {
    if (val == null || isNaN(val)) return '—';
    const n = Number(val);
    if (n >= 1e7)  return `₹${(n/1e7).toFixed(2)} Cr`;
    if (n >= 1e5)  return `₹${(n/1e5).toFixed(2)} L`;
    if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`;
    return inrFmt.format(n);
  }

  function currencyFull(val) {
    if (val == null || isNaN(val)) return '—';
    return inrFmt.format(Number(val));
  }

  function number(val) {
    if (val == null || isNaN(val)) return '—';
    return numFmt.format(Number(val));
  }

  function weight(val) {
    if (val == null || isNaN(val) || Number(val) === 0) return '—';
    const n = Number(val);
    if (n >= 1000) {
      const t = n / 1000;
      return `${Number.isInteger(t) ? t : t.toFixed(2)} T`;
    }
    if (n >= 1) {
      return `${Number.isInteger(n) ? n : n.toFixed(2)} KG`;
    }
    const g = n * 1000;
    return `${Number.isInteger(g) ? g : g.toFixed(0)} g`;
  }

  function pct(val, total) {
    if (!total || total === 0) return '0%';
    return `${((val/total)*100).toFixed(1)}%`;
  }

  function date(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function shortDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  function badge_confidence(conf) {
    const map = { HIGH:'conf-high', MEDIUM:'conf-medium', LOW:'conf-low', 'MANUAL REVIEW':'conf-review' };
    return map[conf] || 'badge-muted';
  }

  return { currency, currencyFull, number, weight, pct, date, shortDate, badge_confidence };
})();
