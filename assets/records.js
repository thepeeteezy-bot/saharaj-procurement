(() => {
  "use strict";

  const API_URL = window.APP_CONFIG?.API_URL || "";
  const tbody = document.getElementById("recordsBody");
  const message = document.getElementById("recordsMessage");
  const searchInput = document.getElementById("searchInput");
  const refreshButton = document.getElementById("refreshButton");
  const csvButton = document.getElementById("csvButton");
  const countLabel = document.getElementById("recordCount");
  const totalLabel = document.getElementById("recordTotal");
  const filterButtons = [...document.querySelectorAll("[data-filter]")];

  let records = [];
  let activeFilter = "all";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const formatAmount = (value) => new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  };

  const showMessage = (text, type = "error") => {
    message.hidden = false;
    message.className = `message ${type}`;
    message.textContent = text;
  };

  const getVisibleRecords = () => {
    const query = searchInput.value.trim().toLowerCase();

    return records.filter((item) => {
      const matchesType = activeFilter === "all" || item.type === activeFilter;
      const searchable = [
        item.document_no,
        item.subject,
        item.vendor,
        item.department,
        item.tax_id,
        item.project_no
      ].join(" ").toLowerCase();

      return matchesType && (!query || searchable.includes(query));
    });
  };

  const render = () => {
    const visible = getVisibleRecords();

    if (!visible.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ไม่พบข้อมูล</td></tr>';
    } else {
      tbody.innerHTML = visible.map((item) => {
        const typeName = item.type === "purchase" ? "ใบสั่งซื้อ" : "ใบสั่งจ้าง";
        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.document_no)}</strong>
              <div class="type-pill">${typeName}</div>
            </td>
            <td>${escapeHtml(formatDate(item.date))}</td>
            <td>${escapeHtml(item.subject)}</td>
            <td class="align-right">${formatAmount(item.amount)}</td>
            <td>${escapeHtml(item.vendor)}</td>
            <td>${escapeHtml(item.tax_id)}</td>
            <td>${escapeHtml(item.department || "")}</td>
            <td>${escapeHtml(item.project_no)}</td>
          </tr>
        `;
      }).join("");
    }

    const total = visible.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    countLabel.textContent = `${visible.length.toLocaleString("th-TH")} รายการ`;
    totalLabel.textContent = `รวม ${formatAmount(total)} บาท`;
  };

  const loadRecords = async () => {
    message.hidden = true;
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">กำลังโหลดข้อมูล…</td></tr>';

    if (!API_URL || API_URL.includes("PASTE_YOUR")) {
      showMessage("ยังไม่ได้กำหนด API_URL ในไฟล์ assets/config.js");
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ยังไม่ได้เชื่อมต่อ Google Apps Script</td></tr>';
      return;
    }

    try {
      const response = await fetch(`${API_URL}?action=list&ts=${Date.now()}`, {
        method: "GET",
        redirect: "follow",
        cache: "no-store"
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.message || "รูปแบบข้อมูลไม่ถูกต้อง");
      }

      records = result.data;
      render();
    } catch (error) {
      console.error(error);
      showMessage("โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบ URL ของ Web App และสิทธิ์การเผยแพร่");
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    }
  };

  const csvEscape = (value) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };

  const exportCsv = () => {
    const visible = getVisibleRecords();
    if (!visible.length) {
      showMessage("ไม่มีข้อมูลสำหรับดาวน์โหลด");
      return;
    }

    const rows = [
      ["เลขที่", "วันที่", "เรื่อง", "จำนวนเงิน", "สถานประกอบการ", "เลขผู้เสียภาษี", "ฝ่ายงานที่รับผิดชอบ", "เลขที่โครงการ"],
      ...visible.map((item) => [
        item.document_no,
        item.date,
        item.subject,
        item.amount,
        item.vendor,
        item.tax_id,
        item.department || "",
        item.project_no
      ])
    ];

    const csv = "\uFEFF" + rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `saharaj-procurement-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle("active", item === button));
      render();
    });
  });

  searchInput.addEventListener("input", render);
  refreshButton.addEventListener("click", loadRecords);
  csvButton.addEventListener("click", exportCsv);

  loadRecords();
})();
