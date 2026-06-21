# ระบบใบสั่งซื้อ–สั่งจ้าง งานพัสดุ โรงเรียนสหราษฎร์รังสฤษดิ์

ระบบนี้ใช้สถาปัตยกรรม:

- หน้าเว็บ: HTML + CSS + JavaScript
- Hosting: GitHub Pages
- Backend/API: Google Apps Script Web App
- ฐานข้อมูล: Google Sheet

## โครงสร้างหน้าเว็บ

- `index.html` — หน้าหลัก
- `purchase.html` — แบบบันทึกใบสั่งซื้อ
- `hire.html` — แบบบันทึกใบสั่งจ้าง
- `records.html` — รายการเอกสาร ประกอบด้วย  
  เลขที่, วันที่, เรื่อง, จำนวนเงิน, สถานประกอบการ, เลขผู้เสียภาษี, เลขที่โครงการ

---

## 1. สร้าง Google Sheet

1. สร้าง Google Sheet ใหม่
2. ตั้งชื่อ เช่น `ระบบใบสั่งซื้อ-สั่งจ้าง`
3. คัดลอก Spreadsheet ID จาก URL

ตัวอย่าง URL:

```text
https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXX/edit
```

Spreadsheet ID คือข้อความระหว่าง `/d/` และ `/edit`

ไม่จำเป็นต้องสร้างหัวตารางเอง เพราะ Apps Script จะสร้าง Sheet ชื่อ `Documents` และหัวตารางให้อัตโนมัติ

---

## 2. ติดตั้ง Google Apps Script

1. ใน Google Sheet ไปที่ **ส่วนขยาย > Apps Script**
2. เปิดไฟล์ `google-apps-script/Code.gs`
3. คัดลอกโค้ดทั้งหมดไปวางใน Apps Script
4. แก้บรรทัดนี้:

```javascript
const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
```

ให้เป็น Spreadsheet ID ของคุณ

5. ตั้ง Time zone ของโครงการเป็น `Asia/Bangkok`
6. กด **Deploy > New deployment**
7. เลือกชนิด **Web app**
8. Execute as: **Me**
9. Who has access: **Anyone**
10. กด Deploy และอนุญาตสิทธิ์
11. คัดลอก URL ที่ลงท้ายด้วย `/exec`

---

## 3. ตั้งค่า URL ในเว็บไซต์

เปิดไฟล์:

```text
assets/config.js
```

แก้ค่า:

```javascript
API_URL: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

เป็น URL ของ Apps Script Web App

---

## 4. อัปโหลดขึ้น GitHub Pages

1. สร้าง GitHub repository ใหม่ เช่น `saharaj-procurement`
2. อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดในชุดนี้
3. ไปที่ **Settings > Pages**
4. Source เลือก **Deploy from a branch**
5. Branch เลือก `main` และโฟลเดอร์ `/root`
6. กด Save

เว็บไซต์จะมีรูปแบบประมาณ:

```text
https://USERNAME.github.io/saharaj-procurement/
```

---

## รูปแบบเลขเอกสารอัตโนมัติ

- ใบสั่งซื้อ: `ซื้อ-001/2569`
- ใบสั่งจ้าง: `จ้าง-001/2569`

ผู้ใช้งานสามารถกรอกเลขที่เอกสารเองได้ หากเว้นว่าง ระบบจะออกเลขให้ตามประเภทและปี พ.ศ.

---

## ข้อควรระวัง

เวอร์ชันนี้เป็นระบบภายในแบบพื้นฐาน หน้าแบบฟอร์มเปิดให้ผู้ที่มีลิงก์สามารถเพิ่มข้อมูลได้ จึงควร:

- ใช้ลิงก์ภายในหน่วยงาน
- ไม่ใส่ข้อมูลลับหรือข้อมูลส่วนบุคคลที่ไม่จำเป็น
- สำรอง Google Sheet เป็นระยะ
- หากต้องการจำกัดสิทธิ์ ควรเพิ่ม Google Sign-In หรือระบบตรวจสอบบัญชีผู้ใช้ในระยะต่อไป
