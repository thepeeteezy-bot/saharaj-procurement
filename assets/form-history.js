(() => {
  "use strict";

  const API_URL = window.APP_CONFIG?.API_URL || "";
  const type = document.body.dataset.documentType;
  const tbody = document.querySelector(".formHistoryBody");
  const message = document.querySelector(".formHistoryMessage");
  const countLabel = document.querySelector(".formHistoryCount");
  const totalLabel = document.querySelector(".formHistoryTotal");
  const refreshButton = document.querySelector(".history-refresh-button");

  if (!tbody || !type) return;

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

  const showMessage = (text, mode = "error") => {
    message.hidden = false;
    message.className = `formHistoryMessage message ${mode}`;
    message.textContent = text;
  };

  const clearMessage = () => {
    message.hidden = true;
    message.textContent = "";
  };

  const render = (records) => {
    if (!records.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ยังไม่มีรายการที่บันทึก</td></tr>';
      countLabel.textContent = "0 รายการ";
      totalLabel.textContent = "รวม 0.00 บาท";
      return;
    }

    tbody.innerHTML = records.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.document_no)}</strong></td>
        <td>${escapeHtml(formatDate(item.date))}</td>
        <td>${escapeHtml(item.subject)}</td>
        <td class="align-right">${formatAmount(item.amount)}</td>
        <td>${escapeHtml(item.vendor)}</td>
        <td>${escapeHtml(item.tax_id)}</td>
        <td>${escapeHtml(item.department || "")}</td>
        <td>${escapeHtml(item.project_no)}</td>
      </tr>
    `).join("");

    const total = records.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );

    countLabel.textContent = `${records.length.toLocaleString("th-TH")} รายการ`;
    totalLabel.textContent = `รวม ${formatAmount(total)} บาท`;
  };

  const loadFormHistory = async () => {
    clearMessage();
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">กำลังโหลดรายการ…</td></tr>';

    if (!API_URL || API_URL.includes("PASTE_YOUR")) {
      showMessage("ยังไม่ได้กำหนด API_URL ในไฟล์ assets/config.js");
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ยังไม่ได้เชื่อมต่อ Google Apps Script</td></tr>';
      return;
    }

    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "กำลังโหลด…";
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

      const filtered = result.data.filter((item) => item.type === type);
      render(filtered);
    } catch (error) {
      console.error(error);
      showMessage("โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบ URL และการ Deploy ของ Google Apps Script");
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    } finally {
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = "โหลดข้อมูลใหม่";
      }
    }
  };

  window.loadFormHistory = loadFormHistory;

  if (refreshButton) {
    refreshButton.addEventListener("click", loadFormHistory);
  }

  document.addEventListener("document-saved", loadFormHistory);

  loadFormHistory();
})();
