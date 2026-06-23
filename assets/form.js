(() => {
  "use strict";

  const form = document.getElementById("documentForm");
  const message = document.getElementById("formMessage");
  const submitButton = document.getElementById("submitButton");
  const API_URL = window.APP_CONFIG?.API_URL || "";

  const setToday = () => {
    const dateInput = form.elements.date;
    if (!dateInput.value) {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      dateInput.value = local.toISOString().slice(0, 10);
    }
  };

  const showMessage = (text, type) => {
    message.hidden = false;
    message.className = `message ${type}`;
    message.textContent = text;
  };

  const clearValidation = () => {
    [...form.elements].forEach((element) => {
      if (element.removeAttribute) element.removeAttribute("aria-invalid");
    });
  };

  const validateForm = () => {
    clearValidation();

    const requiredFields = ["date", "subject", "amount", "vendor", "tax_id", "project_no", "department"];
    for (const fieldName of requiredFields) {
      const input = form.elements[fieldName];
      if (!String(input.value || "").trim()) {
        input.setAttribute("aria-invalid", "true");
        input.focus();

        if (fieldName === "department") {
          showMessage("กรุณากรอกฝ่ายงานที่รับผิดชอบ สามารถกรอกข้อความใดก็ได้ แต่ห้ามเว้นว่าง", "error");
        } else {
          showMessage("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
        }

        return false;
      }
    }

    const amount = Number(form.elements.amount.value);
    if (!Number.isFinite(amount) || amount < 0) {
      form.elements.amount.setAttribute("aria-invalid", "true");
      form.elements.amount.focus();
      showMessage("จำนวนเงินต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป", "error");
      return false;
    }

    const taxId = form.elements.tax_id.value.trim();
    if (!/^\d{13}$/.test(taxId)) {
      form.elements.tax_id.setAttribute("aria-invalid", "true");
      form.elements.tax_id.focus();
      showMessage("เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก", "error");
      return false;
    }

    return true;
  };

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      message.hidden = true;
      clearValidation();
      setToday();
    }, 0);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    if (!API_URL || API_URL.includes("PASTE_YOUR")) {
      showMessage("ยังไม่ได้กำหนด API_URL ในไฟล์ assets/config.js", "error");
      return;
    }

    const formData = new FormData(form);
    const payload = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      payload.append(key, String(value).trim());
    }

    submitButton.disabled = true;
    submitButton.textContent = "กำลังบันทึก…";
    message.hidden = true;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: payload,
        redirect: "follow"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "ไม่สามารถบันทึกข้อมูลได้");
      }

      const savedDate = form.elements.date.value;
      form.reset();
      form.elements.date.value = savedDate;
      showMessage(`บันทึกสำเร็จ เลขที่เอกสาร: ${result.document_no}`, "success");
      document.dispatchEvent(new CustomEvent("document-saved", { detail: result }));
    } catch (error) {
      console.error(error);
      showMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบ URL ของ Web App และสิทธิ์การเผยแพร่", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = `บันทึก${document.body.dataset.documentType === "purchase" ? "ใบสั่งซื้อ" : "ใบสั่งจ้าง"}`;
    }
  });

  setToday();
})();
