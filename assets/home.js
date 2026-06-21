(() => {
  "use strict";

  const API_URL = window.APP_CONFIG?.API_URL || "";
  const tbody = document.getElementById("homeRecordsBody");
  const message = document.getElementById("homeRecordsMessage");
  const countLabel = document.getElementById("homeRecordCount");
  const totalLabel = document.getElementById("homeRecordTotal");

  if (!tbody) return;

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

  const showMessage = (text) => {
    message.hidden = false;
    message.className = "message error";
    message.textContent = text;
  };

  const loadRecentRecords = async () => {
    if (!API_URL || API_URL.includes("PASTE_YOUR")) {
      showMessage("ยังไม่ได้เชื่อมต่อ Google Apps Script กรุณากำหนด API_URL ใน assets/config.js");
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ยังไม่มีการเชื่อมต่อฐานข้อมูล</td></tr>';
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

      const recent = result.data.slice(0, 8);

      if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ยังไม่มีรายการที่บันทึก</td></tr>';
        countLabel.textContent = "0 รายการ";
        totalLabel.textContent = "รวม 0.00 บาท";
        return;
      }

      tbody.innerHTML = recent.map((item) => {
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

      const total = recent.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      );

      countLabel.textContent = `${recent.length.toLocaleString("th-TH")} รายการล่าสุด`;
      totalLabel.textContent = `รวม ${formatAmount(total)} บาท`;
    } catch (error) {
      console.error(error);
      showMessage("โหลดรายการไม่สำเร็จ กรุณาตรวจสอบ URL และการ Deploy ของ Google Apps Script");
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    }
  };

  loadRecentRecords();
})();
