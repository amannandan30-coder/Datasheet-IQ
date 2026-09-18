/* global namespace */
window.App = window.App || {};

/* ============================================================
   FORMATTERS — Currency, Weight, Numbers
   ============================================================ */
App.Fmt = (() => {
  const inrFmtInt = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    maximumFractionDigits: 0, minimumFractionDigits: 0
  });

  const inrFmtDec = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    maximumFractionDigits: 2, minimumFractionDigits: 2
  });

  const numFmt = new Intl.NumberFormat('en-IN');

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currencyText(val) {
    if (val == null || isNaN(val)) return '—';
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e7)  return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5)  return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
    if (abs % 1 !== 0) {
      return inrFmtDec.format(n);
    }
    return inrFmtInt.format(n);
  }

  function currencyFull(val) {
    if (val == null || isNaN(val)) return '—';
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    if (n % 1 !== 0) {
      return inrFmtDec.format(n);
    }
    return inrFmtInt.format(n);
  }

  function currency(val, asHtml = true) {
    if (val == null || isNaN(val)) return '—';
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    const text = currencyText(n);
    const isCompact = Math.abs(n) >= 1000;
    if (asHtml && isCompact) {
      const full = currencyFull(n);
      return `<span class="fmt-compact" title="${escapeHtml(full)}">${text}</span>`;
    }
    return text;
  }

  function number(val) {
    if (val == null || isNaN(val)) return '—';
    return numFmt.format(Number(val));
  }

  function mass(val, asHtml = true) {
    if (val == null || isNaN(val) || Number(val) === 0) return '—';
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    let text;
    let full = null;
    if (n >= 1000) {
      const t = n / 1000;
      text = (Number.isInteger(t) ? t : t.toFixed(2)) + ' T';
      full = `${numFmt.format(n)} KG`;
    } else if (n >= 1) {
      text = (Number.isInteger(n) ? n : n.toFixed(2)) + ' KG';
    } else {
      const g = n * 1000;
      text = (Number.isInteger(g) ? g : g.toFixed(0)) + ' g';
    }
    if (asHtml && full) {
      return `<span class="fmt-compact" title="${escapeHtml(full)}">${text}</span>`;
    }
    return text;
  }

  function volume(val, asHtml = true) {
    if (val == null || isNaN(val) || Number(val) === 0) return '—';
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    let text;
    let full = null;
    if (n >= 1000) {
      const kl = n / 1000;
      text = kl.toFixed(2) + ' kL';
      full = `${numFmt.format(n)} L`;
    } else {
      text = n.toFixed(2) + ' L';
    }
    if (asHtml && full) {
      return `<span class="fmt-compact" title="${escapeHtml(full)}">${text}</span>`;
    }
    return text;
  }

  function weight(val, asHtml = true) {
    return mass(val, asHtml);
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

  return { currency, currencyText, currencyFull, number, weight, mass, volume, pct, date, shortDate, badge_confidence, escapeHtml };
})();

