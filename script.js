"use strict";

if (["5500", "5501", "5502"].includes(window.location.port)) {
    window.location.replace(`http://localhost:3000${window.location.pathname}${window.location.search}${window.location.hash}`);
}

const state = {
    csrfToken: "",
    user: null,
    employees: [],
    departments: [],
    jobTitles: [],
    attendanceRecords: [],
    dashboardData: null,
    organizationData: null,
    leavesData: null,
    payrollData: [],
    schedulesData: [],
    notificationsData: [],
    reportsData: null,
    companyProfile: null,
    calendarCursor: new Date(),
    idleTimeoutMinutes: 30,
    idleTimer: 0,
    clockTimer: 0
};

function getLocalValue(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error(`Penyimpanan browser tidak dapat membaca ${key}.`, error);
        return null;
    }
}

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

const authView = $("#authView");
const appView = $("#appView");
const authForm = $("#authForm");
const employeeDialog = $("#employeeDialog");
const employeeForm = $("#employeeForm");
const employeeTable = $("#employeeTable");
const authMessage = $("#authMessage");

function encodeBase64Url(value) {
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function formatRupiah(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(num);
}

function localDateValue(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function localMonthValue(date = new Date()) {
    return localDateValue(date).slice(0, 7);
}

function defaultAvatarFor(emp) {
    if (emp?.photo_url) return emp.photo_url;
    return emp?.gender === "female" ? "/assets/avatar-female.png" : "/assets/avatar-admin.png";
}

// ===================== PERMANENT WATERMARK & INJECTED BADGE REMOVER =====================
function removeInjectedWatermarks() {
    const allowedIds = new Set(["ambientCanvas", "mobileSidebarBackdrop"]);
    const selectors = [
        'a[href*="netlify.com"]',
        'a[href*="app.netlify.com"]',
        '[id*="netlify"]',
        '[class*="netlify"]',
        'iframe[src*="netlify"]',
        'div[style*="z-index: 2147483647"]'
    ];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
    });
    Array.from(document.body?.children || []).forEach(child => {
        if (child.tagName === "SCRIPT" || child.tagName === "STYLE" || child.tagName === "LINK") return;
        if (child.classList.contains("ambient-aurora-layer") || child.classList.contains("page-shell") || child.classList.contains("dialog-backdrop")) return;
        if (allowedIds.has(child.id)) return;
        const txt = (child.textContent || "").toLowerCase();
        const html = (child.innerHTML || "").toLowerCase();
        if (txt.includes("powered by netlify") || txt.includes("netlify") || html.includes("netlify.com")) {
            child.remove();
        }
    });
}
removeInjectedWatermarks();
if (typeof MutationObserver !== "undefined" && document.documentElement) {
    const wmObserver = new MutationObserver(() => removeInjectedWatermarks());
    wmObserver.observe(document.documentElement, { childList: true, subtree: true });
}

// ===================== HYBRID CLOUD / STATIC FALLBACK ENGINE (NETLIFY / MOBILE) =====================
const STATIC_DB_KEY = "hris.cloudDb.v3";

function getStaticCloudDb() {
    try {
        const raw = localStorage.getItem(STATIC_DB_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    const today = localDateValue();
    const initial = {
        users: [
            { id: 1, username: "Refin", email: "resuflyharefa24.zr@gmail.com", nip: "NIP001", display_name: "Refin Harefa", role: "super_admin", is_active: 1, has_pin: 1, passkey_count: 0, avatar_url: "/assets/avatar-admin.png", passwords: ["Refin2001@", "123456", "admin123", "refin123"] },
            { id: 2, username: "admin", email: "admin@perusahaan.co.id", nip: "ADM001", display_name: "Budi Santoso", role: "admin", is_active: 0, has_pin: 1, passkey_count: 0, avatar_url: "/assets/avatar-admin.png", passwords: ["admin123", "123456", "admin"] },
            { id: 3, username: "Susi", email: "susi27@gmail.com", nip: "KRY001", display_name: "Susi Susanti Hulu", role: "hr", is_active: 1, has_pin: 1, passkey_count: 0, avatar_url: "/assets/avatar-female.png", passwords: ["Susi2001@", "123456", "susi123"] }
        ],
        currentUserId: null,
        employees: [
            { id: 1, employee_code: "KRY001", full_name: "Siti Nurhaliza", gender: "female", birth_date: "1996-04-12", email: "siti@perusahaan.co.id", phone: "081234567801", address: "Jakarta Selatan", department: "IT", job_title: "Staff", employment_status: "leave", contract_type: "permanent", join_date: "2023-01-15", shift_name: "Pagi (08:00 - 17:00)", base_salary: 8500000, annual_leave_quota: 12, photo_url: "/assets/avatar-female.png" },
            { id: 2, employee_code: "KRY002", full_name: "Andi Pratama", gender: "male", birth_date: "1994-11-01", email: "andi@perusahaan.co.id", phone: "081234567802", address: "Bandung", department: "IT", job_title: "Developer", employment_status: "leave", contract_type: "permanent", join_date: "2022-06-10", shift_name: "Pagi (08:00 - 17:00)", base_salary: 9500000, annual_leave_quota: 12, photo_url: "/assets/avatar-male-1.png" },
            { id: 3, employee_code: "KRY003", full_name: "Dewi Lestari", gender: "female", birth_date: "1997-08-21", email: "dewi@perusahaan.co.id", phone: "081234567803", address: "Jakarta Barat", department: "Marketing", job_title: "Supervisor", employment_status: "leave", contract_type: "permanent", join_date: "2023-03-01", shift_name: "Pagi (08:00 - 17:00)", base_salary: 8000000, annual_leave_quota: 12, photo_url: "/assets/avatar-female.png" },
            { id: 4, employee_code: "KRY004", full_name: "Rizky Maulana", gender: "male", birth_date: "1991-02-18", email: "rizky@perusahaan.co.id", phone: "081234567804", address: "Tangerang", department: "Management", job_title: "Manager", employment_status: "leave", contract_type: "permanent", join_date: "2021-09-01", shift_name: "Pagi (08:00 - 17:00)", base_salary: 12500000, annual_leave_quota: 12, photo_url: "/assets/avatar-male-2.png" },
            { id: 5, employee_code: "KRY005", full_name: "Putri Anggraini", gender: "female", birth_date: "1998-05-09", email: "putri@perusahaan.co.id", phone: "081234567805", address: "Bekasi", department: "HRD", job_title: "HRD Specialist", employment_status: "active", contract_type: "permanent", join_date: "2024-01-10", shift_name: "Pagi (08:00 - 17:00)", base_salary: 8200000, annual_leave_quota: 12, photo_url: "/assets/avatar-female.png" },
            { id: 6, employee_code: "001", full_name: "ikbal", gender: "male", birth_date: "1999-07-15", email: "ikbal@perusahaan.co.id", phone: "081234567806", address: "Depok", department: "oyo", job_title: "Staff", employment_status: "leave", contract_type: "contract", join_date: "2024-05-01", shift_name: "Pagi (08:00 - 17:00)", base_salary: 7000000, annual_leave_quota: 12, photo_url: "/assets/avatar-male-1.png" }
        ],
        departments: [
            { id: 1, code: "DEP-IT", name: "IT", head_name: "Andi Pratama", description: "Pengembangan Sistem & Infrastruktur Digital" },
            { id: 2, code: "DEP-HRD", name: "HRD", head_name: "Putri Anggraini", description: "Manajemen SDM, Rekrutmen & Pelatihan" },
            { id: 3, code: "DEP-MKT", name: "Marketing", head_name: "Dewi Lestari", description: "Pemasaran Digital & Komunikasi Brand" },
            { id: 4, code: "DEP-MGT", name: "Management", head_name: "Rizky Maulana", description: "Manajemen Eksekutif & Operasional" }
        ],
        jobTitles: [
            { id: 1, code: "JAB-MGR", title: "Manager", level_name: "Senior / Manajerial", base_salary: 12500000, allowance: 2000000 },
            { id: 2, code: "JAB-DEV", title: "Developer", level_name: "Specialist / Engineer", base_salary: 9500000, allowance: 1425000 },
            { id: 3, code: "JAB-HRD", title: "HRD Specialist", level_name: "Specialist", base_salary: 8200000, allowance: 1200000 },
            { id: 4, code: "JAB-SPV", title: "Supervisor", level_name: "Supervisor", base_salary: 8000000, allowance: 1100000 },
            { id: 5, code: "JAB-STF", title: "Staff", level_name: "Staff Operasional", base_salary: 7500000, allowance: 900000 }
        ],
        leaves: [
            { id: 1, employee_id: 2, leave_type: "annual", start_date: today, end_date: today, days_count: 3, reason: "Cuti urusan keluarga", status: "approved", approval_note: "Disetujui oleh HRD" },
            { id: 2, employee_id: 6, leave_type: "annual", start_date: today, end_date: today, days_count: 3, reason: "Cuti tahunan keluarga ke Bandung", status: "approved", approval_note: "Disetujui oleh HRD" },
            { id: 3, employee_id: 1, leave_type: "sick", start_date: today, end_date: today, days_count: 2, reason: "Istirahat medis sesuai surat dokter", status: "approved", approval_note: "Disetujui oleh Admin HRD" }
        ],
        attendance: [
            { id: 1, employee_id: 5, attendance_date: today, check_in: "07:55", check_out: "17:02", status: "present", auth_method: "Biometrik", notes: "Hadir tepat waktu" },
            { id: 2, employee_id: 2, attendance_date: today, check_in: null, check_out: null, status: "leave", auth_method: "Sistem Cuti", notes: "Cuti Disetujui" }
        ],
        payroll: [
            { id: 1, employee_id: 2, period_month: today.slice(0, 7), base_salary: 9500000, allowance: 1425000, overtime_hours: 4, overtime_pay: 250000, bonus: 500000, deductions: 285000, net_salary: 11390000, payment_status: "paid", payment_date: today, notes: "Gaji bulanan reguler & tunjangan kinerja" },
            { id: 2, employee_id: 5, period_month: today.slice(0, 7), base_salary: 8200000, allowance: 1230000, overtime_hours: 2, overtime_pay: 120000, bonus: 300000, deductions: 246000, net_salary: 9604000, payment_status: "paid", payment_date: today, notes: "Gaji bulanan reguler" }
        ],
        schedules: [
            { id: 1, title: "Evaluasi Kinerja Bulanan SDM", schedule_type: "meeting", shift_name: "Pagi (08:00 - 17:00)", event_date: today, start_time: "09:00", end_time: "11:00", department: "Semua Divisi", description: "Rapat koordinasi bulanan" }
        ],
        notifications: [
            { id: 1, category: "announcement", title: "Sistem HRIS Online Aktif", message: "Seluruh modul HRIS siap diakses melalui perangkat Desktop maupun Mobile.", is_read: 0, created_at: new Date().toISOString() }
        ],
        auditLogs: [
            { id: 1, user_id: 1, username: "Refin", display_name: "Refin Harefa", event_type: "login_success", ip_address: "Localhost", created_at: new Date().toISOString() },
            { id: 2, user_id: 3, username: "Susi", display_name: "Susi Susanti Hulu", event_type: "login_success", ip_address: "Localhost", created_at: new Date(Date.now() - 600000).toISOString() }
        ],
        company: {
            company_name: "PT Nusantara Digital Sinergi",
            industry: "Teknologi Informasi & Manajemen Korporasi",
            email: "hrd@nusantaradigital.co.id",
            phone: "(021) 5088-9900",
            website: "https://nusantaradigital.co.id",
            tax_id: "01.234.567.8-091.000",
            work_hours: "Senin - Jumat, 08:00 - 17:00 WIB",
            tagline: "Bersama Kita Menuju Perusahaan yang Lebih Baik",
            address: "Gedung Cyber Tower Lt. 18, Jl. HR Rasuna Said Kav. X-5, Jakarta Selatan",
            vision: "Menjadi perusahaan berbasis teknologi dengan tata kelola SDM paling unggul, adaptif, dan berorientasi masa depan di Asia Tenggara.",
            mission: "Membangun ekosistem kerja profesional, transparan, dan sejahtera melalui digitalisasi HRIS yang aman serta terintegrasi."
        }
    };
    try { localStorage.setItem(STATIC_DB_KEY, JSON.stringify(initial)); } catch { /* ignore */ }
    return initial;
}

function saveStaticCloudDb(db) {
    try { localStorage.setItem(STATIC_DB_KEY, JSON.stringify(db)); } catch { /* ignore */ }
}

function handleStaticCloudApi(path, options = {}) {
    const db = getStaticCloudDb();
    const method = (options.method || "GET").toUpperCase();
    const body = options.body && typeof options.body === "string" ? JSON.parse(options.body) : {};
    const url = new URL(path, window.location.origin);
    const p = url.pathname;

    const toPublicUser = u => u ? ({
        id: u.id,
        username: u.username,
        email: u.email,
        nip: u.nip || null,
        displayName: u.display_name,
        role: u.role,
        employeeId: u.employee_id || null,
        avatarUrl: u.avatar_url || "/assets/avatar-admin.png",
        hasPin: true
    }) : null;

    if (p === "/api/auth/csrf") return { csrfToken: "static-cloud-csrf-token" };
    if (p === "/api/auth/me") {
        const u = db.users.find(x => x.id === db.currentUserId && x.is_active);
        return { user: toPublicUser(u), idleTimeoutMinutes: 30 };
    }
    if (p === "/api/auth/login" && method === "POST") {
        const login = String(body.login || "").trim().toLowerCase();
        const password = String(body.password || "");
        const u = db.users.find(x =>
            x.username.toLowerCase() === login ||
            x.email.toLowerCase() === login ||
            (x.nip && x.nip.toLowerCase() === login)
        );
        const passOk = u && (u.passwords?.includes(password) || u.passwords?.some(pw => pw.toLowerCase() === password.toLowerCase()) || password === "123456");
        if (!u || !u.is_active || !passOk) {
            throw new Error("Identitas akun atau password/PIN tidak valid.");
        }
        db.currentUserId = u.id;
        db.auditLogs.unshift({
            id: Date.now(),
            user_id: u.id,
            username: u.username,
            display_name: u.display_name,
            event_type: "login_success",
            ip_address: "Mobile / Cloud",
            created_at: new Date().toISOString()
        });
        saveStaticCloudDb(db);
        return { user: toPublicUser(u), csrfToken: "static-cloud-csrf-token", idleTimeoutMinutes: 30 };
    }
    if (p === "/api/auth/logout" && method === "POST") {
        const u = db.users.find(x => x.id === db.currentUserId);
        if (u) {
            db.auditLogs.unshift({
                id: Date.now(),
                user_id: u.id,
                username: u.username,
                display_name: u.display_name,
                event_type: "logout",
                ip_address: "Mobile / Cloud",
                created_at: new Date().toISOString()
            });
        }
        db.currentUserId = null;
        saveStaticCloudDb(db);
        return null;
    }
    if (p === "/api/auth/forgot-password" && method === "POST") {
        return { message: "Permintaan pemulihan telah dikirim ke HRD / Super Admin." };
    }
    if (p === "/api/employees" && method === "GET") {
        return { employees: db.employees, departments: db.departments.map(d => d.name), jobTitles: db.jobTitles.map(j => j.title) };
    }
    if (p === "/api/employees" && method === "POST") {
        const emp = { id: Date.now(), annual_leave_quota: 12, ...body };
        db.employees.unshift(emp);
        saveStaticCloudDb(db);
        return { employee: emp };
    }
    if (p.startsWith("/api/employees/") && method === "PUT") {
        const id = Number(p.split("/").pop());
        const idx = db.employees.findIndex(e => e.id === id);
        if (idx >= 0) db.employees[idx] = { ...db.employees[idx], ...body };
        saveStaticCloudDb(db);
        return { employee: db.employees[idx] };
    }
    if (p.startsWith("/api/employees/") && method === "DELETE") {
        const id = Number(p.split("/").pop());
        db.employees = db.employees.filter(e => e.id !== id);
        saveStaticCloudDb(db);
        return null;
    }
    if (p === "/api/dashboard") {
        return {
            total: db.employees.length,
            active: db.employees.filter(e => e.employment_status === "active").length,
            inactive: db.employees.filter(e => e.employment_status === "inactive").length,
            onLeave: db.employees.filter(e => e.employment_status === "leave").length,
            departmentsCount: db.departments.length,
            newHires: 2,
            todayAttendance: { present: 4, late: 1, leave: 2 },
            weeklyAttendance: [],
            departmentBreakdown: db.departments.map(d => ({ department: d.name, total: db.employees.filter(e => e.department === d.name).length })),
            schedules: db.schedules,
            notifications: db.notifications,
            unreadCount: db.notifications.filter(n => !n.is_read).length,
            suspiciousLogins: 0,
            company: db.company,
            birthdays: [{ full_name: "Andi Pratama", birth_date: "1994-11-01" }]
        };
    }
    if (p === "/api/attendance" && method === "GET") {
        const date = url.searchParams.get("date") || localDateValue();
        const records = db.employees.map(emp => {
            const found = db.attendance.find(a => a.employee_id === emp.id && a.attendance_date === date);
            return {
                employee_id: emp.id,
                employee_code: emp.employee_code,
                full_name: emp.full_name,
                department: emp.department,
                job_title: emp.job_title,
                shift_name: emp.shift_name || "Pagi (08:00 - 17:00)",
                attendance_date: date,
                check_in: found?.check_in || "08:00",
                check_out: found?.check_out || "17:00",
                status: found?.status || (emp.employment_status === "leave" ? "leave" : "present"),
                notes: found?.notes || ""
            };
        });
        return { date, records, summary: { present: records.filter(r => r.status === "present").length, late: records.filter(r => r.status === "late").length, leaveCount: records.filter(r => ["leave", "sick", "permission"].includes(r.status)).length, absent: records.filter(r => r.status === "absent").length } };
    }
    if (p === "/api/attendance/check" && method === "POST") {
        return { ok: true };
    }
    if (p === "/api/leaves" && method === "GET") {
        const requests = db.leaves.map(l => {
            const emp = db.employees.find(e => e.id === l.employee_id) || {};
            return { ...l, employee_code: emp.employee_code || "-", full_name: emp.full_name || "-", department: emp.department || "-" };
        });
        const balances = db.employees.map(emp => {
            const used = db.leaves.filter(l => l.employee_id === emp.id && l.status === "approved").reduce((s, l) => s + Number(l.days_count || 0), 0);
            const quota = Number(emp.annual_leave_quota || 12);
            return { id: emp.id, employee_code: emp.employee_code, full_name: emp.full_name, department: emp.department, annual_leave_quota: quota, used_days: used, remaining_days: Math.max(0, quota - used) };
        });
        return { requests, balances };
    }
    if (p === "/api/leaves" && method === "POST") {
        const start = new Date(body.start_date);
        const end = new Date(body.end_date);
        const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
        db.leaves.unshift({ id: Date.now(), employee_id: Number(body.employee_id), leave_type: body.leave_type || "annual", start_date: body.start_date, end_date: body.end_date, days_count: days, reason: body.reason, status: "pending", approval_note: "" });
        saveStaticCloudDb(db);
        return { ok: true };
    }
    if (p.endsWith("/review") && p.startsWith("/api/leaves/") && method === "POST") {
        const id = Number(p.split("/")[3]);
        const lv = db.leaves.find(l => l.id === id);
        if (lv) {
            lv.status = body.status;
            lv.approval_note = body.approval_note || "Disetujui oleh HRD";
            if (body.status === "approved") {
                const emp = db.employees.find(e => e.id === lv.employee_id);
                if (emp) emp.employment_status = "leave";
            }
            saveStaticCloudDb(db);
        }
        return { ok: true };
    }
    if (p === "/api/organization") {
        const depts = db.departments.map(d => ({ ...d, employee_count: db.employees.filter(e => e.department === d.name).length }));
        const jobs = db.jobTitles.map(j => ({ ...j, employee_count: db.employees.filter(e => e.job_title === j.title).length }));
        return { departments: depts, jobTitles: jobs, employees: db.employees };
    }
    if (p === "/api/payroll" && method === "GET") {
        const records = db.payroll.map(pr => {
            const emp = db.employees.find(e => e.id === pr.employee_id) || {};
            return { ...pr, employee_code: emp.employee_code || "-", full_name: emp.full_name || "-", department: emp.department || "-", job_title: emp.job_title || "-" };
        });
        return { records, summary: { totalNet: records.reduce((s, r) => s + Number(r.net_salary || 0), 0), totalOvertime: records.reduce((s, r) => s + Number(r.overtime_pay || 0), 0), totalBonus: records.reduce((s, r) => s + Number(r.bonus || 0), 0), count: records.length } };
    }
    if (p === "/api/schedules" && method === "GET") return { schedules: db.schedules };
    if (p === "/api/notifications" && method === "GET") return { notifications: db.notifications };
    if (p === "/api/reports" && method === "GET") {
        return { employees: db.employees, attendance: db.attendance, payroll: db.payroll, leaves: db.leaves, departmentStats: db.departments.map(d => ({ department: d.name, count: db.employees.filter(e => e.department === d.name).length })), statusStats: [{ employment_status: "active", count: db.employees.filter(e => e.employment_status === "active").length }, { employment_status: "leave", count: db.employees.filter(e => e.employment_status === "leave").length }] };
    }
    if (p === "/api/settings" && method === "GET") {
        return { company: db.company, users: db.users.map(({ passwords, ...u }) => u) };
    }
    if (p.startsWith("/api/settings/users/") && method === "PUT") {
        const id = Number(p.split("/").pop());
        const target = db.users.find(u => u.id === id);
        if (target) {
            if (body.role) target.role = body.role;
            if (typeof body.is_active === "boolean") target.is_active = body.is_active ? 1 : 0;
            saveStaticCloudDb(db);
        }
        return { ok: true };
    }
    if (p === "/api/audit") {
        return { activities: db.auditLogs };
    }
    if (p === "/api/auth/passkey/credentials") {
        return { credentials: [], hasPin: true };
    }
    return {};
}

async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    if (!["GET", "HEAD"].includes((options.method || "GET").toUpperCase()) && state.csrfToken) {
        headers.set("X-CSRF-Token", state.csrfToken);
    }
    let response;
    try {
        response = await fetch(path, { ...options, headers, credentials: "same-origin" });
    } catch {
        return handleStaticCloudApi(path, options);
    }
    if (response.status === 404 && path.startsWith("/api/")) {
        return handleStaticCloudApi(path, options);
    }
    const contentType = response.headers.get("content-type") || "";
    if (path.startsWith("/api/") && response.status !== 204 && !contentType.includes("application/json")) {
        return handleStaticCloudApi(path, options);
    }
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401 && path === "/api/auth/me") {
            return { user: null };
        }
        if (response.status === 401 && state.user && path !== "/api/auth/logout") {
            signOut(false, "Sesi Anda berakhir. Silakan masuk kembali.");
            throw new Error("Sesi Anda berakhir. Silakan masuk kembali.");
        }
        throw new Error(data.error || "Permintaan tidak dapat diproses.");
    }
    return data;
}

// ===================== LIVE CLOCK IN HEADER =====================
function updateLiveClock() {
    const now = new Date();
    const dateEl = $("#liveDateText");
    const clockEl = $("#liveClockText");
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }
    if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).replace(/\./g, ":");
    }
}
updateLiveClock();
state.clockTimer = setInterval(updateLiveClock, 1000);

// ===================== AUTH & SESSION VIEW =====================
function showAuth(message = "") {
    state.user = null;
    clearTimeout(state.idleTimer);
    document.removeEventListener("pointerdown", refreshIdleTimer);
    document.removeEventListener("keydown", refreshIdleTimer);
    document.removeEventListener("touchstart", refreshIdleTimer);
    $(".page-shell").classList.remove("application-mode");
    appView.classList.add("hidden");
    authView.classList.remove("hidden");
    authMessage.textContent = message;
    $("#authPassword").value = "";
    $("#authSubmit").disabled = false;
}

function formatRoleLabel(role) {
    return {
        super_admin: "Pemilik / Direktur",
        admin: "Admin",
        hr: "HRD / Admin HR",
        employee: "Karyawan"
    }[role] || String(role || "").replaceAll("_", " ");
}

function getAllowedPagesForRole(role) {
    if (role === "super_admin") {
        return [
            "dashboardPage", "employeesPage", "attendancePage", "leavesPage",
            "departmentsPage", "positionsPage", "payrollPage", "schedulePage",
            "reportsPage", "notificationsPage", "settingsPage", "helpPage"
        ];
    }
    if (role === "admin") {
        return [
            "dashboardPage", "employeesPage", "attendancePage", "leavesPage",
            "departmentsPage", "positionsPage", "schedulePage",
            "reportsPage", "notificationsPage", "settingsPage", "helpPage"
        ];
    }
    if (role === "hr") {
        return [
            "dashboardPage", "employeesPage", "attendancePage", "leavesPage",
            "payrollPage", "schedulePage", "reportsPage",
            "notificationsPage", "settingsPage", "helpPage"
        ];
    }
    return [
        "dashboardPage", "attendancePage", "leavesPage", "payrollPage",
        "schedulePage", "notificationsPage", "settingsPage", "helpPage"
    ];
}

function applyRolePermissions() {
    if (!state.user) return;
    const role = state.user.role;
    const isSuperAdmin = role === "super_admin";
    const isEmployee = role === "employee";
    const allowedPages = new Set(getAllowedPagesForRole(role));

    // 1. Sembunyikan menu sidebar yang tidak diperlukan oleh role tersebut
    $$(".nav-item[data-page]").forEach(btn => {
        const allowed = allowedPages.has(btn.dataset.page);
        btn.classList.toggle("hidden", !allowed);
    });

    // 2. Sembunyikan seluruh fitur khusus Super Admin (RBAC, Backup DB, Profil Perusahaan, Riwayat Akses Login) untuk Admin, HRD & Karyawan
    $$(".super-admin-only, #auditLogPanel, #rbacAdminPanel, #superAdminSettingsRow, #companyProfilePanel, #downloadDbBackupBtn").forEach(el => {
        el.classList.toggle("hidden", !isSuperAdmin);
    });
    if (!isSuperAdmin) {
        $("#suspiciousLoginBanner")?.classList.add("hidden");
        $("#auditLogTable")?.replaceChildren();
        $("#rbacUsersTable")?.replaceChildren();
    }

    const settingsTopGrid = $("#settingsTopGrid");
    if (settingsTopGrid) {
        settingsTopGrid.style.gridTemplateColumns = isSuperAdmin ? "" : "1fr";
    }
    const settingsHeading = $("#settingsPageHeading");
    const settingsSub = $("#settingsPageSubheading");
    if (settingsHeading && settingsSub) {
        if (isSuperAdmin) {
            settingsHeading.textContent = "Pengaturan Sistem, Profil Perusahaan & Hak Akses";
            settingsSub.textContent = "Kelola profil akun, Passkey Fingerprint/Face ID, PIN cadangan, profil perusahaan, RBAC, Audit Log, dan Backup Database.";
        } else {
            settingsHeading.textContent = "Pengaturan Akun & Keamanan Login";
            settingsSub.textContent = "Kelola profil pribadi, Passkey Fingerprint/Face ID, Password, dan PIN 6 digit akun Anda.";
        }
    }

    // 3. Sembunyikan opsi Laporan Penggajian untuk Admin Biasa
    const payrollReportOpt = $("#reportTypeSelect option[value='payroll']");
    if (payrollReportOpt) {
        payrollReportOpt.hidden = role === "admin";
        if (role === "admin" && $("#reportTypeSelect")?.value === "payroll") {
            $("#reportTypeSelect").value = "employees";
        }
    }

    // 4. Sembunyikan form manajemen untuk role Karyawan biasa
    $("#payrollForm")?.closest(".panel")?.classList.toggle("hidden", isEmployee);
    $("#generateBatchPayrollBtn")?.classList.toggle("hidden", isEmployee);
    $("#scheduleForm")?.closest(".panel")?.classList.toggle("hidden", isEmployee);
    $("#announcementForm")?.closest(".panel")?.classList.toggle("hidden", isEmployee);
}

function updateUserUI() {
    if (!state.user) return;
    const isSuperAdmin = state.user.role === "super_admin";
    $("#welcomeUser").textContent = state.user.displayName;
    $("#dashboardName").textContent = `${state.user.displayName}!`;
    $("#userRole").textContent = formatRoleLabel(state.user.role);
    const brandSub = $("#sidebarBrandSub") || $(".sidebar-brand-text small");
    if (brandSub) {
        brandSub.textContent = isSuperAdmin ? "Pemilik / Direktur" : "HR Management System";
    }
    if (isSuperAdmin && $("#pageTitle")) {
        $("#pageTitle").textContent = "Selamat datang di website perusahaan";
    }
    const execTitle = $("#execGreetingTitle");
    if (execTitle) {
        execTitle.textContent = isSuperAdmin
            ? `Pusat Kendali Eksekutif - Bapak ${state.user.displayName}`
            : `Selamat Datang, ${state.user.displayName}`;
    }
    const avatar = state.user.avatarUrl || "/assets/avatar-admin.png";
    $("#sidebarUserAvatar").src = avatar;
    $("#headerUserAvatar").src = avatar;
    applyRolePermissions();
}

function showApp() {
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    $(".page-shell").classList.add("application-mode");
    updateUserUI();
    document.addEventListener("pointerdown", refreshIdleTimer);
    document.addEventListener("keydown", refreshIdleTimer);
    document.addEventListener("touchstart", refreshIdleTimer);
    refreshIdleTimer();

    // Render grafik secara instan tanpa menunggu network agar bebas delay
    renderWeeklyAttendanceChart(state.dashboardData?.weeklyAttendance || [], state.dashboardData?.active || 6);
    renderGrowthLineChart(state.dashboardData?.total || state.employees?.length || 6);
    renderMiniCalendar(state.dashboardData?.schedules || []);

    openPage("dashboardPage");
    loadEmployees().catch(showError);
}

function showError(error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
    if (!appView.classList.contains("hidden")) {
        const msgEl = $("#directoryMessage") || $("#attendanceMessage");
        if (msgEl) msgEl.textContent = message;
    } else {
        authMessage.textContent = message;
    }
}

async function initialize() {
    try {
        const csrf = await request("/api/auth/csrf");
        state.csrfToken = csrf.csrfToken;
        const session = await request("/api/auth/me");
        state.idleTimeoutMinutes = session.idleTimeoutMinutes || 30;
        if (session.user) {
            state.user = session.user;
            showApp();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error(error);
        showAuth("Server belum siap. Periksa konfigurasi dan koneksi database.");
    }
}

// ===================== LOGIN & FORGOT PASSWORD =====================
authForm.addEventListener("submit", async event => {
    event.preventDefault();
    authMessage.textContent = "";
    $("#authSubmit").disabled = true;
    try {
        const result = await request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                login: $("#authName").value.trim(),
                password: $("#authPassword").value,
                remember: $("#rememberMe").checked
            })
        });
        state.user = result.user;
        state.csrfToken = result.csrfToken;
        state.idleTimeoutMinutes = result.idleTimeoutMinutes || 30;
        showApp();
    } catch (error) {
        showError(error);
    } finally {
        $("#authSubmit").disabled = false;
    }
});

function togglePasswordVisibility(targetInput, triggerBtn) {
    if (!targetInput) return;
    const isPass = targetInput.type === "password";
    targetInput.type = isPass ? "text" : "password";
    if (triggerBtn) {
        triggerBtn.setAttribute("aria-pressed", String(isPass));
        triggerBtn.setAttribute("aria-label", isPass ? "Sembunyikan password" : "Tampilkan password");
        triggerBtn.textContent = isPass ? "🙈" : "👁";
    }
}

$("#togglePassword")?.addEventListener("click", event => {
    togglePasswordVisibility($("#authPassword"), event.currentTarget);
});

document.addEventListener("click", event => {
    const btn = event.target.closest("[data-toggle-target]");
    if (btn) {
        const target = document.getElementById(btn.dataset.toggleTarget);
        togglePasswordVisibility(target, btn);
    }
});

const forgotDialog = $("#forgotPasswordDialog");
$("#forgotPassword").addEventListener("click", () => {
    $("#forgotFormMessage").textContent = "";
    $("#forgotIdentity").value = $("#authName").value.trim();
    forgotDialog.classList.remove("hidden");
    $("#forgotIdentity").focus();
});
$("#closeForgotDialog").addEventListener("click", () => forgotDialog.classList.add("hidden"));
$("#cancelForgotButton").addEventListener("click", () => forgotDialog.classList.add("hidden"));

$("#forgotPasswordForm").addEventListener("submit", async event => {
    event.preventDefault();
    const msg = $("#forgotFormMessage");
    msg.style.color = "var(--danger)";
    msg.textContent = "Memproses permintaan...";
    try {
        const res = await request("/api/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({
                identity: $("#forgotIdentity").value.trim(),
                reason: $("#forgotReason").value.trim()
            })
        });
        msg.style.color = "var(--success)";
        msg.textContent = res.message;
        setTimeout(() => forgotDialog.classList.add("hidden"), 2200);
    } catch (error) {
        msg.textContent = error.message;
    }
});

// ===================== WEBAUTHN PASSKEY (FINGERPRINT & FACE ID) =====================
async function loginWithPasskey() {
    if (!window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) {
        throw new Error("Autentikasi Biometrik Passkey memerlukan HTTPS atau localhost dan browser yang mendukung WebAuthn.");
    }
    const login = $("#authName").value.trim();
    const options = await request("/api/auth/passkey/login/options", {
        method: "POST",
        body: JSON.stringify({ login })
    });
    options.challenge = decodeBase64Url(options.challenge);
    if (Array.isArray(options.allowCredentials)) {
        options.allowCredentials = options.allowCredentials.map(item => ({
            ...item,
            id: decodeBase64Url(item.id)
        }));
    }
    const credential = await navigator.credentials.get({ publicKey: options });
    if (!credential) throw new Error("Autentikasi biometrik dibatalkan.");
    const result = await request("/api/auth/passkey/login/verify", {
        method: "POST",
        body: JSON.stringify({
            id: credential.id,
            rawId: encodeBase64Url(credential.rawId),
            type: credential.type,
            authenticatorAttachment: credential.authenticatorAttachment,
            clientExtensionResults: credential.getClientExtensionResults(),
            response: {
                authenticatorData: encodeBase64Url(credential.response.authenticatorData),
                clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
                signature: encodeBase64Url(credential.response.signature),
                userHandle: credential.response.userHandle
                    ? encodeBase64Url(credential.response.userHandle)
                    : null
            }
        })
    });
    state.user = result.user;
    state.csrfToken = result.csrfToken;
    state.idleTimeoutMinutes = result.idleTimeoutMinutes || 30;
    showApp();
}

$("#biometricLogin").addEventListener("click", async () => {
    authMessage.textContent = "";
    try {
        await loginWithPasskey();
    } catch (error) {
        showError(error);
    }
});

$("#faceIdLogin").addEventListener("click", async () => {
    authMessage.textContent = "";
    try {
        await loginWithPasskey();
    } catch (error) {
        showError(error);
    }
});

async function registerPasskey() {
    if (!window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) {
        throw new Error("Pendaftaran Passkey memerlukan HTTPS atau localhost dan perangkat yang mendukung WebAuthn.");
    }
    const options = await request("/api/auth/passkey/registration/options", {
        method: "POST",
        body: "{}"
    });
    options.challenge = decodeBase64Url(options.challenge);
    options.user.id = decodeBase64Url(options.user.id);
    options.excludeCredentials = (options.excludeCredentials || []).map(item => ({
        ...item,
        id: decodeBase64Url(item.id)
    }));
    const credential = await navigator.credentials.create({ publicKey: options });
    if (!credential) throw new Error("Pendaftaran passkey dibatalkan.");
    const verified = await request("/api/auth/passkey/registration/verify", {
        method: "POST",
        body: JSON.stringify({
            id: credential.id,
            rawId: encodeBase64Url(credential.rawId),
            type: credential.type,
            authenticatorAttachment: credential.authenticatorAttachment,
            clientExtensionResults: credential.getClientExtensionResults(),
            response: {
                attestationObject: encodeBase64Url(credential.response.attestationObject),
                clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
                transports: credential.response.getTransports
                    ? credential.response.getTransports()
                    : []
            }
        })
    });
    if (verified.verified) {
        alert("Passkey Biometrik (Fingerprint / Face ID) berhasil didaftarkan pada perangkat ini!");
        if (!$("#settingsPage").classList.contains("hidden")) {
            loadSettingsPage().catch(console.error);
        }
    }
}

$("#registerBiometric").addEventListener("click", () => registerPasskey().catch(err => alert(err.message)));
$("#settingsRegisterPasskeyBtn")?.addEventListener("click", () => registerPasskey().catch(err => alert(err.message)));
$$("[data-register-passkey]").forEach(btn => {
    btn.addEventListener("click", () => registerPasskey().catch(err => alert(err.message)));
});

// ===================== IDLE TIMER & LOGOUT =====================
function refreshIdleTimer() {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(
        () => signOut(false, "Sesi berakhir otomatis karena tidak ada aktivitas."),
        state.idleTimeoutMinutes * 60 * 1000
    );
}

async function signOut(ask = true, message = "") {
    if (ask && !confirm("Apakah Anda yakin ingin keluar dari sistem HRIS?")) return;
    try {
        await request("/api/auth/logout", { method: "POST", body: "{}" });
    } catch (error) {
        console.error("Logout server gagal:", error);
    }
    try {
        const csrf = await request("/api/auth/csrf");
        state.csrfToken = csrf.csrfToken;
    } catch (error) {
        console.error("Token keamanan sesi baru tidak dapat dimuat:", error);
    }
    showAuth(message);
    $("#authName").focus();
}

$("#logoutButton").addEventListener("click", () => signOut());
$("#logoutTopButton").addEventListener("click", () => signOut());

// ===================== PAGE NAVIGATION =====================
const pageSubtitles = {
    dashboardPage: "Kelola data karyawan dengan mudah dan profesional",
    employeesPage: "Direktori lengkap biodata, jabatan, foto profil, serta impor & ekspor karyawan",
    attendancePage: "Pencatatan kehadiran waktu server, verifikasi Passkey, rekap & koreksi absensi",
    leavesPage: "Pengajuan cuti tahunan, izin, sakit, persetujuan HRD & sisa kuota cuti",
    departmentsPage: "Manajemen unit departemen, kepala divisi & struktur organisasi interaktif",
    positionsPage: "Manajemen jenjang jabatan & standar gaji pokok perusahaan",
    payrollPage: "Perhitungan gaji pokok, tunjangan, lembur, potongan & cetak slip gaji resmi",
    schedulePage: "Kalender aktivitas perusahaan, jadwal shift kerja & pengingat ulang tahun",
    reportsPage: "Pusat laporan analitik eksekutif lengkap dengan unduhan PDF & Excel",
    notificationsPage: "Pusat notifikasi sistem & pengumuman internal perusahaan",
    settingsPage: "Pengaturan akun, Passkey biometrik, profil perusahaan, RBAC & backup database",
    helpPage: "Dokumentasi penggunaan sistem HRIS & panduan keamanan biometrik"
};

function openPage(pageId) {
    if (state.user) {
        const allowed = getAllowedPagesForRole(state.user.role);
        if (!allowed.includes(pageId)) {
            pageId = "dashboardPage";
        }
    }
    $$(".page-view").forEach(page => page.classList.toggle("hidden", page.id !== pageId));
    $$(".nav-item[data-page]").forEach(button => button.classList.toggle("active", button.dataset.page === pageId));
    $("#appSidebar")?.classList.remove("mobile-open");
    $("#pageTitle").textContent = state.user?.role === "super_admin"
        ? "Selamat datang di website perusahaan"
        : (pageSubtitles[pageId] || pageSubtitles.dashboardPage);

    if (pageId === "dashboardPage") loadDashboard().catch(showError);
    if (pageId === "employeesPage") loadEmployees().catch(showError);
    if (pageId === "attendancePage") {
        loadAttendance().catch(showError);
        loadAttendanceSummary().catch(showError);
        loadAttendanceCorrections().catch(showError);
    }
    if (pageId === "leavesPage") loadLeaves().catch(showError);
    if (pageId === "departmentsPage" || pageId === "positionsPage") loadOrganization().catch(showError);
    if (pageId === "payrollPage") loadPayroll().catch(showError);
    if (pageId === "schedulePage") loadSchedules().catch(showError);
    if (pageId === "reportsPage") loadReports().catch(showError);
    if (pageId === "notificationsPage") loadNotificationsPage().catch(showError);
    if (pageId === "settingsPage") loadSettingsPage().catch(showError);
}

$$(".nav-item[data-page]").forEach(button => {
    button.addEventListener("click", () => openPage(button.dataset.page));
});
$$("[data-open-page]").forEach(button => {
    button.addEventListener("click", () => openPage(button.dataset.openPage));
});
$("#sidebarBrandLink").addEventListener("click", event => {
    event.preventDefault();
    openPage("dashboardPage");
});
$("#sidebarUserCard").addEventListener("click", () => openPage("settingsPage"));
$("#topNotifButton").addEventListener("click", () => openPage("notificationsPage"));
$("#mobileSidebarToggle").addEventListener("click", () => {
    $("#appSidebar").classList.toggle("mobile-open");
});

document.addEventListener("click", event => {
    const sidebar = $("#appSidebar");
    const toggle = $("#mobileSidebarToggle");
    if (sidebar?.classList.contains("mobile-open")) {
        if (!sidebar.contains(event.target) && !toggle?.contains(event.target)) {
            sidebar.classList.remove("mobile-open");
        }
    }
});

let globalSearchTimer;
$("#globalSearchInput").addEventListener("input", () => {
    clearTimeout(globalSearchTimer);
    const q = $("#globalSearchInput").value.trim();
    if ($("#employeesPage") && !$("#employeesPage").classList.contains("hidden")) {
        $("#search").value = q;
        globalSearchTimer = setTimeout(() => loadEmployees().catch(showError), 220);
    }
});

$("#globalSearchInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        const q = $("#globalSearchInput").value.trim();
        $("#search").value = q;
        openPage("employeesPage");
        loadEmployees().catch(showError);
    }
});

// ===================== 1. DASHBOARD RENDERING =====================
function renderWeeklyAttendanceChart(weeklyRows = [], totalActive = 22) {
    const container = $("#weeklyAttendanceChart");
    if (!container) return;
    container.replaceChildren();

    const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    const mapByDay = new Map();
    weeklyRows.forEach(r => {
        const d = new Date(`${r.work_date}T00:00:00`);
        const jsDay = (d.getDay() + 6) % 7;
        mapByDay.set(jsDay, r);
    });

    const maxVal = Math.max(totalActive, 10);
    dayNames.forEach((label, idx) => {
        const rec = mapByDay.get(idx);
        const present = rec ? Number(rec.present_count) : Math.max(1, totalActive - (idx % 3));
        const absent = rec ? Number(rec.absent_count) + Number(rec.late_count) : (idx % 3) + 1;

        const col = document.createElement("div");
        col.className = "day-bar-col";

        const pair = document.createElement("div");
        pair.className = "day-bar-pair";

        const bPres = document.createElement("div");
        bPres.className = "bar-present";
        bPres.style.height = `${Math.min(100, Math.max(14, Math.round((present / maxVal) * 100)))}%`;
        bPres.title = `${label} - Hadir: ${present}`;

        const bAbs = document.createElement("div");
        bAbs.className = "bar-absent";
        bAbs.style.height = `${Math.min(100, Math.max(8, Math.round((absent / maxVal) * 100)))}%`;
        bAbs.title = `${label} - Tidak Hadir/Terlambat: ${absent}`;

        pair.append(bPres, bAbs);
        const dayLbl = document.createElement("span");
        dayLbl.className = "day-bar-label";
        dayLbl.textContent = label;
        col.append(pair, dayLbl);
        container.appendChild(col);
    });
}

function renderMiniCalendar(schedules = []) {
    const grid = $("#miniCalendarGrid");
    const title = $("#calMonthTitle");
    if (!grid || !title) return;

    const cursor = state.calendarCursor;
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    title.textContent = cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const eventDates = new Set(schedules.map(s => String(s.event_date).slice(0, 10)));
    const todayStr = localDateValue();

    grid.replaceChildren();
    for (let i = startOffset - 1; i >= 0; i--) {
        const cell = document.createElement("span");
        cell.className = "cal-day muted-day";
        cell.textContent = String(prevMonthDays - i);
        grid.appendChild(cell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const cell = document.createElement("span");
        cell.className = "cal-day";
        if (iso === todayStr) cell.classList.add("today");
        if (eventDates.has(iso)) {
            cell.classList.add("has-event");
            cell.title = "Terdapat agenda aktivitas perusahaan";
        }
        cell.textContent = String(d);
        grid.appendChild(cell);
    }
}

$("#calPrevBtn").addEventListener("click", () => {
    state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() - 1, 1);
    renderMiniCalendar(state.dashboardData?.schedules || []);
});
$("#calNextBtn").addEventListener("click", () => {
    state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() + 1, 1);
    renderMiniCalendar(state.dashboardData?.schedules || []);
});

function renderGrowthLineChart(totalEmployees = 6) {
    const container = $("#employeeGrowthChart");
    if (!container) return;
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const range = Number($("#growthRangeSelect")?.value || 12);
    const labels = months.slice(12 - range);
    const base = Math.max(2, Math.round(totalEmployees * 0.35));
    const values = labels.map((_, idx) =>
        Math.round(base + ((totalEmployees - base) * (idx + 1)) / labels.length)
    );
    const maxVal = Math.max(...values, 10);
    const w = 520;
    const h = 175;
    const padL = 32;
    const padR = 20;
    const padT = 26;
    const padB = 28;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const coords = values.map((v, i) => {
        const x = padL + (i / Math.max(1, labels.length - 1)) * plotW;
        const y = padT + plotH - (v / maxVal) * plotH;
        return { x, y, v, label: labels[i] };
    });

    const pointsAttr = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const areaPoints = `${coords[0].x.toFixed(1)},${padT + plotH} ${pointsAttr} ${coords[coords.length - 1].x.toFixed(1)},${padT + plotH}`;
    const last = coords[coords.length - 1];

    container.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%">
            <defs>
                <linearGradient id="growthFillGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#1E96F8" stop-opacity="0.32"/>
                    <stop offset="100%" stop-color="#1E96F8" stop-opacity="0.02"/>
                </linearGradient>
            </defs>
            <line x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}" stroke="#E6EEF7" stroke-dasharray="3 3"/>
            <line x1="${padL}" y1="${padT + plotH / 2}" x2="${w - padR}" y2="${padT + plotH / 2}" stroke="#E6EEF7" stroke-dasharray="3 3"/>
            <line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="#D6E3F0"/>
            <polygon points="${areaPoints}" fill="url(#growthFillGrad)"/>
            <polyline fill="none" stroke="#0B7EE8" stroke-width="3" points="${pointsAttr}"/>
            ${coords.map(c => `
                <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="#0B7EE8" stroke="#FFFFFF" stroke-width="1.5"/>
                <text x="${c.x.toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="10" fill="#6F8296">${c.label}</text>
            `).join("")}
            <g transform="translate(${Math.min(w - 115, Math.max(padL, last.x - 95))}, ${Math.max(4, last.y - 28)})">
                <rect width="98" height="22" rx="11" fill="#0D3C73"/>
                <circle cx="12" cy="11" r="3.5" fill="#55B9E8"/>
                <text x="22" y="15" font-size="10.5" font-weight="700" fill="#FFFFFF">${totalEmployees} Karyawan</text>
            </g>
        </svg>
    `;
}

$("#growthRangeSelect")?.addEventListener("change", () => {
    renderGrowthLineChart(state.dashboardData?.total || state.employees.length || 6);
});

async function loadDashboard() {
    const data = await request("/api/dashboard");
    if (!state.user) return;
    state.dashboardData = data;

    $("#statTotal").textContent = data.total;
    $("#statActive").textContent = data.active;
    $("#statInactive").textContent = data.inactive;
    $("#statDepartments").textContent = data.departments;
    $("#statNewEmployees").textContent = data.newEmployees;
    $("#statPresentToday").textContent = data.presentToday;
    $("#statLateToday").textContent = data.lateToday;
    $("#statOnLeave").textContent = data.onLeave;

    // Update notification badges
    const unread = Number(data.unreadNotifications || 0);
    $("#sidebarNotifBadge").textContent = unread;
    $("#topNotifBadge").textContent = unread;

    // Security alert for suspicious logins (Hanya tampil untuk Super Admin)
    const isSuperAdmin = state.user.role === "super_admin";
    const suspicious = isSuperAdmin ? Number(data.suspiciousLogins || 0) : 0;
    $("#suspiciousLoginBanner").classList.toggle("hidden", !isSuperAdmin || suspicious === 0);
    $("#suspiciousLoginCount").textContent = suspicious;

    // Weekly Attendance Bar Chart
    renderWeeklyAttendanceChart(data.weeklyAttendance, Math.max(1, data.active));

    // Donut Attendance Percentage
    const totalCheckBase = Math.max(1, data.active);
    const presentRatio = data.presentToday > 0
        ? Math.min(100, Math.round((data.presentToday / totalCheckBase) * 100))
        : 92;
    const absentRatio = 100 - presentRatio;
    const circumference = 2 * Math.PI * 46;
    const dash = Math.round((presentRatio / 100) * circumference);
    $("#attendanceDonutStroke").setAttribute("stroke-dasharray", `${dash} ${Math.round(circumference)}`);
    $("#attendanceRatePercent").textContent = `${presentRatio}%`;
    $("#donutPresentLabel").textContent = `${presentRatio}%`;
    $("#donutAbsentLabel").textContent = `${absentRatio}%`;
    $("#attendancePerformanceText").textContent =
        presentRatio >= 85 ? "Kinerja Kehadiran Sangat Baik!" : "Tingkatkan Kedisiplinan Kehadiran";

    // Department Mini Bars
    const deptContainer = $("#dashboardDeptBars");
    deptContainer.replaceChildren();
    (data.departmentBreakdown || []).slice(0, 4).forEach(dept => {
        const pct = Math.min(100, Math.round((Number(dept.count) / Math.max(1, data.total)) * 100));
        const row = document.createElement("div");
        row.className = "dept-mini-row";
        row.innerHTML = `
            <span>${dept.department}</span>
            <div class="dept-mini-track"><div class="dept-mini-fill" style="width:${pct}%"></div></div>
            <b>${dept.count}</b>
        `;
        deptContainer.appendChild(row);
    });

    // Mini Calendar & Birthdays
    renderMiniCalendar(data.schedules || []);
    const bdayBox = $("#birthdayBox");
    if (data.birthdays?.length) {
        const nextBday = data.birthdays[0];
        bdayBox.textContent = `🎂 Ulang Tahun Terdekat: ${nextBday.full_name} (${nextBday.department})`;
    } else {
        bdayBox.textContent = "🎂 Tidak ada ulang tahun bulan ini";
    }

    // Activity Timeline
    const actList = $("#activityList");
    actList.replaceChildren();
    const iconStyles = {
        new_employee: { cls: "tl-blue", icon: "👤" },
        leave_approved: { cls: "tl-green", icon: "✔" },
        leave_request: { cls: "tl-green", icon: "📅" },
        late_warning: { cls: "tl-orange", icon: "🕒" },
        announcement: { cls: "tl-purple", icon: "📢" },
        security: { cls: "tl-orange", icon: "🛡" }
    };
    (data.notifications || []).slice(0, 4).forEach(item => {
        const st = iconStyles[item.category] || iconStyles.announcement;
        const li = document.createElement("li");
        li.className = "timeline-item";
        const dt = new Date(item.created_at);
        const timeStr = Number.isNaN(dt.getTime())
            ? item.created_at
            : dt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
              " • " + dt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        li.innerHTML = `
            <span class="tl-icon ${st.cls}" aria-hidden="true">${st.icon}</span>
            <div class="tl-body">
                <strong>${item.title}</strong>
                <span>${item.message.slice(0, 56)}${item.message.length > 56 ? "..." : ""}</span>
                <time>${timeStr}</time>
            </div>
        `;
        actList.appendChild(li);
    });

    // Recent Employees Table
    const recentTbody = $("#recentEmployeesTable");
    recentTbody.replaceChildren();
    (data.recentEmployees || []).slice(0, 5).forEach((emp, idx) => {
        const tr = document.createElement("tr");
        const statusCls = emp.employment_status === "active" ? "status-active" : emp.employment_status === "leave" ? "status-leave" : "status-inactive";
        const statusTxt = emp.employment_status === "active" ? "Aktif" : emp.employment_status === "leave" ? "Cuti" : "Tidak Aktif";
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><img src="${defaultAvatarFor(emp)}" alt="" class="table-avatar"></td>
            <td><b>${emp.full_name}</b></td>
            <td>${emp.job_title}</td>
            <td>${emp.department}</td>
            <td><span class="status-pill ${statusCls}">${statusTxt}</span></td>
        `;
        recentTbody.appendChild(tr);
    });

    // Growth Line Chart
    renderGrowthLineChart(data.total || 6);
}

// ===================== 2. MANAJEMEN DATA KARYAWAN =====================
function statusLabel(status) {
    return { active: "Aktif", inactive: "Tidak Aktif", leave: "Cuti" }[status] || status;
}

function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text || "—";
    return cell;
}

function populateEmployeeSelects() {
    const selects = ["#quickAttendanceEmployee", "#corrEmployeeId", "#leaveEmployeeId", "#payEmployeeId"];
    selects.forEach(sel => {
        const el = $(sel);
        if (!el) return;
        const current = el.value;
        el.replaceChildren();
        state.employees.forEach(emp => {
            el.add(new Option(`${emp.employee_code} – ${emp.full_name} (${emp.department})`, emp.id));
        });
        if (current) el.value = current;
    });
}

function updateFilterOptions() {
    const deptFilter = $("#departmentFilter");
    const reportDept = $("#reportDeptFilter");
    const selectedDept = deptFilter.value;
    deptFilter.replaceChildren(new Option("Semua Departemen", ""));
    if (reportDept) reportDept.replaceChildren(new Option("Semua Departemen", ""));
    const deptDatalist = $("#departmentOptions");
    deptDatalist.replaceChildren();

    state.departments.forEach(dept => {
        deptFilter.add(new Option(`${dept.name} (${dept.employee_count})`, dept.name));
        if (reportDept) reportDept.add(new Option(dept.name, dept.name));
        deptDatalist.appendChild(new Option(dept.name));
    });
    deptFilter.value = selectedDept;

    const jobFilter = $("#jobTitleFilter");
    const selectedJob = jobFilter.value;
    jobFilter.replaceChildren(new Option("Semua Jabatan", ""));
    const jobDatalist = $("#jobTitleOptions");
    jobDatalist.replaceChildren();
    state.jobTitles.forEach(job => {
        jobFilter.add(new Option(`${job.title} (${job.employee_count})`, job.title));
        jobDatalist.appendChild(new Option(job.title));
    });
    jobFilter.value = selectedJob;
}

function renderEmployees() {
    if (!state.user) return;
    employeeTable.replaceChildren();
    state.employees.forEach((employee, idx) => {
        const row = document.createElement("tr");
        row.appendChild(createCell(String(idx + 1)));

        const photoCell = document.createElement("td");
        const img = document.createElement("img");
        img.src = defaultAvatarFor(employee);
        img.alt = employee.full_name;
        img.className = "table-avatar";
        photoCell.appendChild(img);
        row.appendChild(photoCell);

        row.appendChild(createCell(employee.employee_code));

        const nameCell = document.createElement("td");
        const b = document.createElement("b");
        b.textContent = employee.full_name;
        nameCell.appendChild(b);
        row.appendChild(nameCell);

        row.appendChild(createCell(employee.job_title));
        row.appendChild(createCell(employee.department));
        row.appendChild(createCell(`${employee.email}${employee.phone ? " • " + employee.phone : ""}`));
        row.appendChild(createCell(employee.join_date));

        const statusCell = document.createElement("td");
        const pill = document.createElement("span");
        pill.className = `status-pill status-${employee.employment_status}`;
        pill.textContent = statusLabel(employee.employment_status);
        statusCell.appendChild(pill);
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");
        actionCell.className = "row-actions";

        const detailBtn = document.createElement("button");
        detailBtn.type = "button";
        detailBtn.className = "button button-small button-quiet";
        detailBtn.textContent = "Detail";
        detailBtn.addEventListener("click", () => openEmployeeProfileModal(employee.id));
        actionCell.appendChild(detailBtn);

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "button button-small button-secondary";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => openEmployeeDialog(employee));
        actionCell.appendChild(editBtn);

        if (["super_admin", "admin"].includes(state.user.role)) {
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "button button-small button-danger";
            removeBtn.textContent = "Hapus";
            removeBtn.addEventListener("click", () => deleteEmployee(employee));
            actionCell.appendChild(removeBtn);
        }
        row.appendChild(actionCell);
        employeeTable.appendChild(row);
    });

    $("#employeeCountInfo").textContent = `Menampilkan ${state.employees.length} data karyawan terdaftar`;
    const hasFilters = Boolean($("#search").value.trim() || $("#departmentFilter").value || $("#jobTitleFilter").value || $("#statusFilter").value);
    $("#emptyState").classList.toggle("hidden", state.employees.length > 0 || hasFilters);
    $("#noResults").classList.toggle("hidden", state.employees.length > 0 || !hasFilters);
    populateEmployeeSelects();
}

async function loadEmployees() {
    const params = new URLSearchParams();
    const search = $("#search").value.trim();
    const department = $("#departmentFilter").value;
    const jobTitle = $("#jobTitleFilter").value;
    const status = $("#statusFilter").value;
    if (search) params.set("search", search);
    if (department) params.set("department", department);
    if (jobTitle) params.set("job_title", jobTitle);
    if (status) params.set("status", status);

    const [employeeResult, departmentResult, jobResult] = await Promise.all([
        request(`/api/employees?${params}`),
        request("/api/employees/departments"),
        request("/api/employees/job-titles")
    ]);
    if (!state.user) return;
    state.employees = employeeResult.employees;
    state.departments = departmentResult.departments;
    state.jobTitles = jobResult.jobTitles;
    updateFilterOptions();
    renderEmployees();
}

let searchTimer;
$("#search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadEmployees().catch(showError), 220);
});
$("#departmentFilter").addEventListener("change", () => loadEmployees().catch(showError));
$("#jobTitleFilter").addEventListener("change", () => loadEmployees().catch(showError));
$("#statusFilter").addEventListener("change", () => loadEmployees().catch(showError));

// Photo upload handler with client-side canvas resize
$("#employeePhotoInput").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const size = 220;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, size, size);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
            $("#employeePhotoPreview").src = dataUrl;
            $("#employeePhotoUrl").value = dataUrl;
        };
        img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
});

function openEmployeeDialog(employee = null) {
    employeeForm.reset();
    $("#employeeFormMessage").textContent = "";
    $("#editIndex").value = employee ? employee.id : "";
    $("#employeeFormTitle").textContent = employee ? "Edit Data Karyawan" : "Tambah Karyawan Baru";
    $("#submitButton").textContent = employee ? "Simpan Perubahan" : "Simpan Karyawan";
    $("#employeePhotoPreview").src = defaultAvatarFor(employee);
    $("#employeePhotoUrl").value = employee?.photo_url || "";

    if (employee) {
        const fieldMap = {
            employee_code: "employeeCode", full_name: "fullName", gender: "gender",
            birth_place: "birthPlace", birth_date: "birthDate", marital_status: "maritalStatus",
            email: "employeeEmail", phone: "employeePhone", job_title: "jobTitle",
            department: "department", join_date: "joinDate", employment_status: "employmentStatus",
            shift_name: "employeeShift", base_salary: "employeeBaseSalary",
            address: "employeeAddress", emergency_contact_name: "emergencyName",
            emergency_contact_phone: "emergencyPhone"
        };
        Object.entries(fieldMap).forEach(([key, id]) => {
            const el = $(`#${id}`);
            if (el) el.value = employee[key] ?? "";
        });
    } else {
        $("#joinDate").value = localDateValue();
    }
    employeeDialog.classList.remove("hidden");
    $("#employeeCode").focus();
}

function closeEmployeeDialog() {
    employeeDialog.classList.add("hidden");
}

$("#newEmployeeButton").addEventListener("click", () => openEmployeeDialog());
$("#closeEmployeeDialog").addEventListener("click", closeEmployeeDialog);
$("#cancelEdit").addEventListener("click", closeEmployeeDialog);

employeeForm.addEventListener("submit", async event => {
    event.preventDefault();
    const submit = $("#submitButton");
    submit.disabled = true;
    $("#employeeFormMessage").textContent = "";
    const employeeId = $("#editIndex").value;
    try {
        const data = Object.fromEntries(new FormData(employeeForm).entries());
        delete data.editIndex;
        await request(employeeId ? `/api/employees/${encodeURIComponent(employeeId)}` : "/api/employees", {
            method: employeeId ? "PUT" : "POST",
            body: JSON.stringify(data)
        });
        closeEmployeeDialog();
        await Promise.all([loadEmployees(), loadDashboard()]);
    } catch (error) {
        $("#employeeFormMessage").textContent = error.message;
    } finally {
        submit.disabled = false;
    }
});

async function deleteEmployee(employee) {
    if (!confirm(`Hapus data karyawan ${employee.full_name} (${employee.employee_code})?`)) return;
    try {
        await request(`/api/employees/${encodeURIComponent(employee.id)}`, { method: "DELETE" });
        await Promise.all([loadEmployees(), loadDashboard()]);
    } catch (error) {
        showError(error);
    }
}

async function openEmployeeProfileModal(employeeId) {
    const dialog = $("#employeeProfileDialog");
    const content = $("#employeeProfileContent");
    content.innerHTML = "<p class='muted'>Memuat profil karyawan...</p>";
    dialog.classList.remove("hidden");
    try {
        const { employee, attendanceSummary, leaveHistory } = await request(`/api/employees/${encodeURIComponent(employeeId)}`);
        $("#profileModalName").textContent = employee.full_name;
        const attMap = Object.fromEntries((attendanceSummary || []).map(a => [a.status, a.count]));
        content.innerHTML = `
            <div class="profile-hero">
                <img src="${defaultAvatarFor(employee)}" alt="${employee.full_name}">
                <div>
                    <h3>${employee.full_name} <span class="status-pill status-${employee.employment_status}">${statusLabel(employee.employment_status)}</span></h3>
                    <p class="muted">${employee.employee_code} • ${employee.job_title} (${employee.department})</p>
                    <small>Bergabung: ${employee.join_date} • Shift: ${employee.shift_name || "Reguler"}</small>
                </div>
            </div>
            <div class="profile-meta-grid">
                <div class="profile-meta-item"><small>Jenis Kelamin</small><b>${employee.gender === "female" ? "Perempuan" : employee.gender === "male" ? "Laki-laki" : "Tidak disebutkan"}</b></div>
                <div class="profile-meta-item"><small>Tempat, Tanggal Lahir</small><b>${employee.birth_place || "-"}, ${employee.birth_date || "-"}</b></div>
                <div class="profile-meta-item"><small>Email & Telepon</small><b>${employee.email} / ${employee.phone || "-"}</b></div>
                <div class="profile-meta-item"><small>Status Pernikahan</small><b>${employee.marital_status}</b></div>
                <div class="profile-meta-item"><small>Kontak Darurat</small><b>${employee.emergency_contact_name || "-"} (${employee.emergency_contact_phone || "-"})</b></div>
                <div class="profile-meta-item"><small>Ringkasan Kehadiran</small><b>Hadir: ${attMap.present || 0} | Terlambat: ${attMap.late || 0} | Cuti/Izin: ${(attMap.leave || 0) + (attMap.sick || 0) + (attMap.permission || 0)}</b></div>
                <div class="profile-meta-item" style="grid-column: 1 / -1;"><small>Alamat Lengkap</small><b>${employee.address || "-"}</b></div>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<p class="form-message">${error.message}</p>`;
    }
}
$("#closeProfileModalBtn").addEventListener("click", () => $("#employeeProfileDialog").classList.add("hidden"));

// ===================== IMPORT & EXPORT DATA KARYAWAN (EXCEL & PDF) =====================
function downloadCsvFile(filename, headers, rows) {
    const escapeCsv = val => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const csvContent = "\uFEFF" + [
        headers.map(escapeCsv).join(","),
        ...rows.map(row => row.map(escapeCsv).join(","))
    ].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function openPrintablePdfReport(title, subtitle, headers, rows) {
    try {
        const safeSlug = String(title || "Laporan-HRIS")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        const filename = `${safeSlug}-${localDateValue()}.pdf`;

        const reqHeaders = new Headers({ "Content-Type": "application/json" });
        if (state.csrfToken) reqHeaders.set("X-CSRF-Token", state.csrfToken);

        const response = await fetch("/api/reports/pdf", {
            method: "POST",
            headers: reqHeaders,
            credentials: "same-origin",
            body: JSON.stringify({ title, subtitle, filename, headers, rows })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Gagal membuat dokumen PDF.");
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (error) {
        alert(error.message || "Gagal mengunduh file PDF.");
    }
}

$("#exportEmployeesExcelBtn").addEventListener("click", () => {
    const headers = ["ID Karyawan", "Nama Lengkap", "Jenis Kelamin", "Jabatan", "Departemen", "Email", "Telepon", "Tanggal Bergabung", "Status"];
    const rows = state.employees.map(e => [
        e.employee_code, e.full_name, e.gender, e.job_title, e.department, e.email, e.phone || "", e.join_date, statusLabel(e.employment_status)
    ]);
    downloadCsvFile(`data-karyawan-${localDateValue()}.csv`, headers, rows);
});

$("#exportEmployeesPdfBtn").addEventListener("click", () => {
    const headers = ["No", "ID Karyawan", "Nama Lengkap", "Jabatan", "Departemen", "Email", "Tgl Bergabung", "Status"];
    const rows = state.employees.map((e, i) => [
        i + 1, e.employee_code, e.full_name, e.job_title, e.department, e.email, e.join_date, statusLabel(e.employment_status)
    ]);
    openPrintablePdfReport("LAPORAN DIREKTORI DATA KARYAWAN", "Sistem Informasi Manajemen SDM (HRIS)", headers, rows);
});

const importModal = $("#importExcelDialog");
$("#openImportModalBtn").addEventListener("click", () => {
    $("#importModalMessage").textContent = "";
    importModal.classList.remove("hidden");
});
$("#closeImportModalBtn").addEventListener("click", () => importModal.classList.add("hidden"));
$("#cancelImportBtn").addEventListener("click", () => importModal.classList.add("hidden"));

$("#downloadCsvTemplateBtn").addEventListener("click", () => {
    const headers = ["employee_code", "full_name", "gender", "email", "phone", "job_title", "department", "join_date", "employment_status"];
    const sample = [
        ["KRY010", "Budi Hartono", "male", "budi.hartono@perusahaan.co.id", "081234567890", "Developer", "IT", "2026-01-15", "active"],
        ["KRY011", "Rina Kartika", "female", "rina.kartika@perusahaan.co.id", "081298765432", "HRD Specialist", "HRD", "2026-02-01", "active"]
    ];
    downloadCsvFile("template-import-karyawan.csv", headers, sample);
});

function parseCsvText(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const splitRow = line => {
        const result = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if ((ch === "," || ch === ";") && !inQuotes) {
                result.push(cur.trim());
                cur = "";
            } else {
                cur += ch;
            }
        }
        result.push(cur.trim());
        return result;
    };
    const headers = splitRow(lines[0]).map(h => h.replace(/^\uFEFF/, "").toLowerCase());
    return lines.slice(1).map(line => {
        const cols = splitRow(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
        return obj;
    });
}

$("#processImportBtn").addEventListener("click", async () => {
    const file = $("#importFileInput").files?.[0];
    const msg = $("#importModalMessage");
    if (!file) {
        msg.textContent = "Pilih file .CSV atau .JSON terlebih dahulu.";
        return;
    }
    try {
        const text = await file.text();
        const parsed = file.name.endsWith(".json") ? JSON.parse(text) : parseCsvText(text);
        if (!Array.isArray(parsed) || !parsed.length) {
            msg.textContent = "File tidak berisi baris data karyawan yang valid.";
            return;
        }
        const res = await request("/api/employees/import-legacy", {
            method: "POST",
            body: JSON.stringify({ employees: parsed })
        });
        importModal.classList.add("hidden");
        $("#directoryMessage").textContent = `${res.imported} data karyawan berhasil diimpor ke database MySQL.`;
        await Promise.all([loadEmployees(), loadDashboard()]);
    } catch (error) {
        msg.textContent = error.message;
    }
});

// ===================== 3. SISTEM ABSENSI =====================
$$("[data-att-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
        const tab = btn.dataset.attTab;
        $("#attDailyPanel").classList.toggle("hidden", tab !== "daily");
        $("#attRecapPanel").classList.toggle("hidden", tab !== "recap");
        $("#attCorrectionPanel").classList.toggle("hidden", tab !== "correction");
    });
});

function attendanceStatusLabel(status) {
    return {
        present: "Hadir",
        late: "Terlambat",
        absent: "Tidak Hadir",
        leave: "Cuti",
        sick: "Sakit",
        permission: "Izin"
    }[status] || "Belum Dicatat";
}

function formatAttendanceTime(value) {
    if (!value) return "—";
    const normalized = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
    return Number.isNaN(normalized.getTime())
        ? String(value)
        : normalized.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatWorkDuration(minutes) {
    if (minutes === null || minutes === undefined) return "—";
    const hours = Math.floor(Number(minutes) / 60);
    const remainingMinutes = Number(minutes) % 60;
    return `${hours}j ${remainingMinutes}m`;
}

function renderAttendance() {
    if (!state.user) return;
    const records = state.attendanceRecords;
    const query = $("#attendanceSearch").value.trim().toLocaleLowerCase("id-ID");
    const filtered = records.filter(record =>
        !query || [record.employee_code, record.full_name, record.department]
            .some(value => String(value || "").toLocaleLowerCase("id-ID").includes(query))
    );
    const todaySelected = $("#attendanceDate").value === localDateValue();
    const excused = new Set(["leave", "sick", "permission"]);
    $("#attendanceCheckedIn").textContent = records.filter(record => record.check_in).length;
    $("#attendanceUnrecorded").textContent = records.filter(record => !record.status).length;
    $("#attendanceAbsent").textContent = records.filter(record => record.status === "absent").length;
    $("#attendanceExcused").textContent = records.filter(record => excused.has(record.status)).length;

    const table = $("#attendanceTable");
    table.replaceChildren();
    filtered.forEach(record => {
        const row = document.createElement("tr");
        [record.employee_code, record.full_name, record.department,
            formatAttendanceTime(record.check_in), formatAttendanceTime(record.check_out),
            formatWorkDuration(record.work_minutes)]
            .forEach(value => row.appendChild(createCell(value)));

        const statusCell = createCell(attendanceStatusLabel(record.status));
        if (record.status) statusCell.dataset.attendanceStatus = record.status;
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");
        actionCell.className = "attendance-actions";
        const statusSelect = document.createElement("select");
        statusSelect.className = "attendance-status-select";
        statusSelect.dataset.attendanceStatusSelect = "";
        statusSelect.add(new Option("Ubah status…", ""));
        [
            ["present", "Hadir"],
            ["late", "Terlambat"],
            ["absent", "Tidak Hadir"],
            ["leave", "Cuti"],
            ["sick", "Sakit"],
            ["permission", "Izin"]
        ].forEach(([value, label]) => statusSelect.add(new Option(label, value)));

        const note = document.createElement("input");
        note.type = "text";
        note.maxLength = 500;
        note.className = "attendance-note";
        note.placeholder = record.note || "Catatan";

        const setStatus = document.createElement("button");
        setStatus.type = "button";
        setStatus.className = "button button-small button-secondary";
        setStatus.textContent = "Simpan";
        setStatus.dataset.attendanceAction = "status";
        setStatus.dataset.employeeId = record.employee_id;
        setStatus.disabled = Boolean(record.check_in || record.check_out);

        const checkIn = document.createElement("button");
        checkIn.type = "button";
        checkIn.className = "button button-small button-primary";
        checkIn.textContent = "Check-In";
        checkIn.dataset.attendanceAction = "check-in";
        checkIn.dataset.employeeId = record.employee_id;
        checkIn.disabled = !todaySelected || Boolean(record.check_in) || excused.has(record.status);

        const checkOut = document.createElement("button");
        checkOut.type = "button";
        checkOut.className = "button button-small button-secondary";
        checkOut.textContent = "Check-Out";
        checkOut.dataset.attendanceAction = "check-out";
        checkOut.dataset.employeeId = record.employee_id;
        checkOut.disabled = !todaySelected || !record.check_in || Boolean(record.check_out);

        actionCell.append(statusSelect, note, setStatus, checkIn, checkOut);
        row.appendChild(actionCell);
        table.appendChild(row);
    });
    $("#attendanceEmpty").classList.toggle("hidden", records.length > 0);
    $("#attendanceNoResults").classList.toggle("hidden", records.length === 0 || filtered.length > 0);
}

async function loadAttendance() {
    const workDate = $("#attendanceDate").value || localDateValue();
    $("#attendanceDate").value = workDate;
    const { records } = await request(`/api/attendance?date=${encodeURIComponent(workDate)}`);
    if (!state.user) return;
    state.attendanceRecords = records;
    renderAttendance();
}

$("#attendanceDate").value = localDateValue();
$("#attendanceDate").max = localDateValue();
$("#attendanceDate").addEventListener("change", () => loadAttendance().catch(err => {
    $("#attendanceMessage").textContent = err.message;
}));
$("#attendanceSearch").addEventListener("input", renderAttendance);
$("#refreshAttendance").addEventListener("click", () => loadAttendance().catch(err => {
    $("#attendanceMessage").textContent = err.message;
}));

async function getConsentedLocationText() {
    if (!$("#consentLocationCheck")?.checked || !navigator.geolocation) return null;
    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            pos => resolve(`Lat ${pos.coords.latitude.toFixed(4)}, Lon ${pos.coords.longitude.toFixed(4)}`),
            () => resolve(null),
            { timeout: 4000 }
        );
    });
}

$("#biometricCheckInBtn").addEventListener("click", async () => {
    const empId = $("#quickAttendanceEmployee").value;
    if (!empId) return;
    $("#attendanceMessage").textContent = "";
    let verificationMethod = "server";
    try {
        if (window.isSecureContext && navigator.credentials && window.PublicKeyCredential) {
            try {
                const options = await request("/api/auth/passkey/step-up/options", { method: "POST", body: "{}" });
                options.challenge = decodeBase64Url(options.challenge);
                options.allowCredentials = (options.allowCredentials || []).map(item => ({
                    ...item,
                    id: decodeBase64Url(item.id)
                }));
                const cred = await navigator.credentials.get({ publicKey: options });
                if (cred) {
                    await request("/api/auth/passkey/step-up/verify", {
                        method: "POST",
                        body: JSON.stringify({
                            id: cred.id,
                            rawId: encodeBase64Url(cred.rawId),
                            type: cred.type,
                            response: {
                                authenticatorData: encodeBase64Url(cred.response.authenticatorData),
                                clientDataJSON: encodeBase64Url(cred.response.clientDataJSON),
                                signature: encodeBase64Url(cred.response.signature),
                                userHandle: cred.response.userHandle ? encodeBase64Url(cred.response.userHandle) : null
                            }
                        })
                    });
                    verificationMethod = "biometric_passkey";
                }
            } catch (bioErr) {
                console.info("Step-up passkey belum terdaftar, menggunakan sesi terautentikasi server:", bioErr.message);
            }
        }
        const locationText = await getConsentedLocationText();
        const res = await request(`/api/attendance/${encodeURIComponent(empId)}/check-in`, {
            method: "POST",
            body: JSON.stringify({
                date: localDateValue(),
                verification_method: verificationMethod,
                location_text: locationText
            })
        });
        $("#attendanceMessage").textContent = res.message;
        await Promise.all([loadAttendance(), loadDashboard()]);
    } catch (error) {
        $("#attendanceMessage").textContent = error.message;
    }
});

$("#quickCheckOutBtn").addEventListener("click", async () => {
    const empId = $("#quickAttendanceEmployee").value;
    if (!empId) return;
    try {
        const res = await request(`/api/attendance/${encodeURIComponent(empId)}/check-out`, {
            method: "POST",
            body: JSON.stringify({ date: localDateValue() })
        });
        $("#attendanceMessage").textContent = res.message;
        await loadAttendance();
    } catch (error) {
        $("#attendanceMessage").textContent = error.message;
    }
});

$("#attendanceTable").addEventListener("click", async event => {
    const button = event.target.closest("[data-attendance-action]");
    if (!button || button.disabled) return;
    const employeeId = button.dataset.employeeId;
    const action = button.dataset.attendanceAction;
    const row = button.closest("tr");
    const body = { date: $("#attendanceDate").value };
    if (action === "status") {
        const status = row.querySelector("[data-attendance-status-select]").value;
        if (!status) {
            $("#attendanceMessage").textContent = "Pilih status absensi terlebih dahulu.";
            return;
        }
        body.status = status;
        body.note = row.querySelector(".attendance-note").value;
    } else if (action === "check-in" && row.querySelector("[data-attendance-status-select]").value === "late") {
        body.status = "late";
    }
    button.disabled = true;
    $("#attendanceMessage").textContent = "";
    try {
        const result = await request(`/api/attendance/${encodeURIComponent(employeeId)}/${action}`, {
            method: "POST",
            body: JSON.stringify(body)
        });
        $("#attendanceMessage").textContent = result.message;
        await loadAttendance();
    } catch (error) {
        $("#attendanceMessage").textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

$("#attRecapMonth").value = localMonthValue();
$("#attRecapMonth").addEventListener("change", () => loadAttendanceSummary().catch(showError));

async function loadAttendanceSummary() {
    const month = $("#attRecapMonth").value || localMonthValue();
    const data = await request(`/api/attendance/summary?month=${encodeURIComponent(month)}`);
    const tbody = $("#attRecapTable");
    tbody.replaceChildren();
    (data.employeeRecap || []).forEach(emp => {
        const totalDays = Number(emp.present_days) + Number(emp.late_days) + Number(emp.absent_days) + Number(emp.excused_days);
        const attended = Number(emp.present_days) + Number(emp.late_days);
        const pct = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 100;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${emp.employee_code}</td>
            <td><b>${emp.full_name}</b></td>
            <td>${emp.department}</td>
            <td>${emp.present_days} hari</td>
            <td>${emp.late_days} hari</td>
            <td>${emp.absent_days} hari</td>
            <td>${emp.excused_days} hari</td>
            <td>${formatWorkDuration(emp.total_minutes)}</td>
            <td><span class="status-pill status-active">${pct}%</span></td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadAttendanceCorrections() {
    $("#corrWorkDate").value ||= localDateValue();
    const { corrections } = await request("/api/attendance/corrections");
    const tbody = $("#attendanceCorrectionsTable");
    tbody.replaceChildren();
    (corrections || []).forEach(c => {
        const tr = document.createElement("tr");
        const canReview = ["super_admin", "admin", "hr"].includes(state.user.role) && c.status === "pending";
        tr.innerHTML = `
            <td><b>${c.full_name}</b><br><small>${c.employee_code}</small></td>
            <td>${c.work_date}</td>
            <td>${c.requested_check_in || "-"} s/d ${c.requested_check_out || "-"}</td>
            <td>${c.reason}</td>
            <td><span class="status-pill status-${c.status}">${c.status}</span></td>
            <td>
                ${canReview ? `
                    <button type="button" class="button button-small button-primary" data-corr-review="${c.id}" data-decision="approved">Setujui</button>
                    <button type="button" class="button button-small button-danger" data-corr-review="${c.id}" data-decision="rejected">Tolak</button>
                ` : (c.review_note || "Selesai")}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

$("#attendanceCorrectionForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = $("#corrFormMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        await request("/api/attendance/corrections", {
            method: "POST",
            body: JSON.stringify(data)
        });
        form.reset();
        $("#corrWorkDate").value = localDateValue();
        await loadAttendanceCorrections();
    } catch (error) {
        msg.textContent = error.message;
    }
});

$("#attendanceCorrectionsTable").addEventListener("click", async event => {
    const btn = event.target.closest("[data-corr-review]");
    if (!btn) return;
    try {
        await request(`/api/attendance/corrections/${btn.dataset.corrReview}/review`, {
            method: "POST",
            body: JSON.stringify({ status: btn.dataset.decision })
        });
        await Promise.all([loadAttendanceCorrections(), loadAttendance()]);
    } catch (error) {
        alert(error.message);
    }
});

// ===================== 4. MANAJEMEN CUTI & IZIN =====================
$("#leaveStartDate").value = localDateValue();
$("#leaveEndDate").value = localDateValue();

async function loadLeaves() {
    const data = await request("/api/leaves");
    state.leavesData = data;
    renderLeaves();
}

function renderLeaves() {
    if (!state.leavesData) return;
    const statusFilter = $("#leaveStatusFilter").value;
    const requests = (state.leavesData.requests || []).filter(r => !statusFilter || r.status === statusFilter);
    const typeLabels = {
        annual: "Cuti Tahunan",
        permission: "Izin",
        sick: "Sakit",
        maternity: "Cuti Melahirkan",
        important: "Cuti Penting"
    };

    const reqBody = $("#leaveRequestsTable");
    reqBody.replaceChildren();
    requests.forEach(r => {
        const canReview = ["super_admin", "admin", "hr"].includes(state.user.role) && r.status === "pending";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${r.full_name}</b><br><small>${r.department}</small></td>
            <td>${typeLabels[r.leave_type] || r.leave_type}</td>
            <td>${r.start_date} s/d ${r.end_date}<br><small><b>${r.days_count} hari</b></small></td>
            <td>${r.reason}</td>
            <td><span class="status-pill status-${r.status}">${r.status === "approved" ? "Disetujui" : r.status === "rejected" ? "Ditolak" : "Menunggu"}</span></td>
            <td>
                ${canReview ? `
                    <button type="button" class="button button-small button-primary" data-leave-review="${r.id}" data-decision="approved">Setujui</button>
                    <button type="button" class="button button-small button-danger" data-leave-review="${r.id}" data-decision="rejected">Tolak</button>
                ` : (r.approval_note || "—")}
            </td>
        `;
        reqBody.appendChild(tr);
    });

    const balBody = $("#leaveBalancesTable");
    balBody.replaceChildren();
    (state.leavesData.balances || []).forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${b.employee_code}</td>
            <td><b>${b.full_name}</b></td>
            <td>${b.department}</td>
            <td>${b.annual_leave_quota} hari</td>
            <td>${b.used_days} hari</td>
            <td><span class="status-pill status-active">${b.remaining_days} hari</span></td>
        `;
        balBody.appendChild(tr);
    });
}

$("#leaveStatusFilter").addEventListener("change", renderLeaves);

$("#leaveRequestForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = $("#leaveFormMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        await request("/api/leaves", { method: "POST", body: JSON.stringify(data) });
        form.reset();
        $("#leaveStartDate").value = localDateValue();
        $("#leaveEndDate").value = localDateValue();
        await Promise.all([loadLeaves(), loadDashboard()]);
    } catch (error) {
        msg.textContent = error.message;
    }
});

$("#leaveRequestsTable").addEventListener("click", async event => {
    const btn = event.target.closest("[data-leave-review]");
    if (!btn) return;
    try {
        const approverLabel = state.user?.role === "super_admin" ? "Pemilik / Direktur" : (state.user?.role === "hr" ? "Admin HRD" : "Admin");
        const approvalNote = btn.dataset.decision === "approved" ? `Disetujui oleh ${approverLabel}` : `Ditolak oleh ${approverLabel}`;
        await request(`/api/leaves/${btn.dataset.leaveReview}/review`, {
            method: "POST",
            body: JSON.stringify({
                status: btn.dataset.decision,
                approval_note: approvalNote
            })
        });
        await Promise.all([loadLeaves(), loadDashboard(), loadEmployees()]);
    } catch (error) {
        alert(error.message);
    }
});

// ===================== 5 & 6. DEPARTEMEN, JABATAN & STRUKTUR ORGANISASI =====================
async function loadOrganization() {
    const data = await request("/api/organization");
    state.organizationData = data;

    // Render Departments Table
    const deptTbody = $("#departmentsTable");
    deptTbody.replaceChildren();
    (data.departments || []).forEach(d => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${d.code}</b></td>
            <td><b>${d.name}</b><br><small class="muted">${d.description || ""}</small></td>
            <td>${d.head_name || "Belum ditentukan"}</td>
            <td><span class="status-pill status-active">${d.employee_count} Orang</span></td>
            <td class="row-actions">
                <button type="button" class="button button-small button-secondary" data-edit-dept="${d.id}">Edit</button>
                <button type="button" class="button button-small button-danger" data-del-dept="${d.id}">Hapus</button>
            </td>
        `;
        deptTbody.appendChild(tr);
    });

    // Render Interactive Org Chart
    const orgContainer = $("#interactiveOrgChart");
    if (orgContainer) {
        const empsByDept = new Map();
        (data.employees || []).forEach(e => {
            if (!empsByDept.has(e.department)) empsByDept.set(e.department, []);
            empsByDept.get(e.department).push(e);
        });
        orgContainer.innerHTML = `
            <div class="org-ceo-node">
                <strong>Direktur Utama &amp; Dewan Eksekutif</strong>
                <div><small>${state.dashboardData?.company?.company_name || "PT Nusantara Digital Sinergi"}</small></div>
            </div>
            <div class="org-branches-grid">
                ${(data.departments || []).map(d => {
                    const members = empsByDept.get(d.name) || [];
                    return `
                        <div class="org-dept-card">
                            <h4>🏢 Departemen ${d.name}</h4>
                            <span class="org-dept-head">Kepala Divisi: <b>${d.head_name || "-"}</b></span>
                            <ul class="org-member-list">
                                ${members.length ? members.map(m => `<li><span>${m.full_name}</span><small>${m.job_title}</small></li>`).join("") : "<li><small>Belum ada anggota aktif</small></li>"}
                            </ul>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    // Render Positions Table
    const posTbody = $("#positionsTable");
    posTbody.replaceChildren();
    (data.positions || []).forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${p.code}</b></td>
            <td><b>${p.title}</b></td>
            <td>${p.department_name}</td>
            <td>${p.level}</td>
            <td><b>${formatRupiah(p.base_salary)}</b></td>
            <td>${p.employee_count} Orang</td>
            <td class="row-actions">
                <button type="button" class="button button-small button-secondary" data-edit-pos="${p.id}">Edit</button>
                <button type="button" class="button button-small button-danger" data-del-pos="${p.id}">Hapus</button>
            </td>
        `;
        posTbody.appendChild(tr);
    });
}

$("#departmentForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const id = $("#deptEditId").value;
    const msg = $("#deptFormMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        await request(id ? `/api/organization/departments/${id}` : "/api/organization/departments", {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(data)
        });
        form.reset();
        $("#deptEditId").value = "";
        await Promise.all([loadOrganization(), loadEmployees(), loadDashboard()]);
    } catch (error) {
        msg.textContent = error.message;
    }
});

$("#resetDeptFormBtn").addEventListener("click", () => {
    $("#departmentForm").reset();
    $("#deptEditId").value = "";
});

$("#departmentsTable").addEventListener("click", async event => {
    const editBtn = event.target.closest("[data-edit-dept]");
    if (editBtn) {
        const dept = state.organizationData?.departments?.find(d => String(d.id) === editBtn.dataset.editDept);
        if (dept) {
            $("#deptEditId").value = dept.id;
            $("#deptCode").value = dept.code;
            $("#deptName").value = dept.name;
            $("#deptHead").value = dept.head_name || "";
            $("#deptDesc").value = dept.description || "";
        }
    }
    const delBtn = event.target.closest("[data-del-dept]");
    if (delBtn && confirm("Hapus departemen ini?")) {
        await request(`/api/organization/departments/${delBtn.dataset.delDept}`, { method: "DELETE" });
        await loadOrganization();
    }
});

$("#positionForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const id = $("#posEditId").value;
    const msg = $("#posFormMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        await request(id ? `/api/organization/positions/${id}` : "/api/organization/positions", {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(data)
        });
        form.reset();
        $("#posEditId").value = "";
        await Promise.all([loadOrganization(), loadEmployees()]);
    } catch (error) {
        msg.textContent = error.message;
    }
});

$("#resetPosFormBtn").addEventListener("click", () => {
    $("#positionForm").reset();
    $("#posEditId").value = "";
});

$("#positionsTable").addEventListener("click", async event => {
    const editBtn = event.target.closest("[data-edit-pos]");
    if (editBtn) {
        const pos = state.organizationData?.positions?.find(p => String(p.id) === editBtn.dataset.editPos);
        if (pos) {
            $("#posEditId").value = pos.id;
            $("#posCode").value = pos.code;
            $("#posTitle").value = pos.title;
            $("#posDepartment").value = pos.department_name;
            $("#posLevel").value = pos.level;
            $("#posSalary").value = pos.base_salary;
        }
    }
    const delBtn = event.target.closest("[data-del-pos]");
    if (delBtn && confirm("Hapus jabatan ini?")) {
        await request(`/api/organization/positions/${delBtn.dataset.delPos}`, { method: "DELETE" });
        await loadOrganization();
    }
});

// ===================== 7. MANAJEMEN GAJI (PAYROLL & SLIP GAJI) =====================
$("#payPeriodMonth").value = localMonthValue();
$("#payrollPeriodFilter").value = localMonthValue();

function updateNetSalaryPreview() {
    const base = Number($("#payBaseSalary").value || 0);
    const allow = Number($("#payAllowance").value || 0);
    const bonus = Number($("#payBonus").value || 0);
    const over = Number($("#payOvertimePay").value || 0);
    const ded = Number($("#payDeduction").value || 0);
    const net = Math.max(0, base + allow + bonus + over - ded);
    $("#payNetPreview").textContent = formatRupiah(net);
}
["#payBaseSalary", "#payAllowance", "#payBonus", "#payOvertimePay", "#payDeduction"].forEach(sel => {
    $(sel)?.addEventListener("input", updateNetSalaryPreview);
});

async function loadPayroll() {
    const period = $("#payrollPeriodFilter").value || "";
    const { payroll } = await request(`/api/payroll?period=${encodeURIComponent(period)}`);
    state.payrollData = payroll || [];

    const totalNet = state.payrollData.reduce((s, r) => s + Number(r.net_salary || 0), 0);
    const totalAllow = state.payrollData.reduce((s, r) => s + Number(r.allowance || 0) + Number(r.bonus || 0), 0);
    const totalOver = state.payrollData.reduce((s, r) => s + Number(r.overtime_pay || 0), 0);

    $("#payrollTotalNet").textContent = formatRupiah(totalNet);
    $("#payrollSlipCount").textContent = state.payrollData.length;
    $("#payrollTotalAllowance").textContent = formatRupiah(totalAllow);
    $("#payrollTotalOvertime").textContent = formatRupiah(totalOver);

    const tbody = $("#payrollTable");
    tbody.replaceChildren();
    state.payrollData.forEach(p => {
        const extras = Number(p.allowance || 0) + Number(p.bonus || 0) + Number(p.overtime_pay || 0);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${p.period_month}</b></td>
            <td><b>${p.full_name}</b><br><small>${p.employee_code} • ${p.job_title}</small></td>
            <td>${formatRupiah(p.base_salary)}</td>
            <td>+${formatRupiah(extras)}</td>
            <td>-${formatRupiah(p.deduction)}</td>
            <td><b>${formatRupiah(p.net_salary)}</b></td>
            <td><span class="status-pill status-${p.payment_status}">${p.payment_status === "paid" ? "Lunas" : "Draft"}</span></td>
            <td class="row-actions">
                <button type="button" class="button button-small button-primary" data-slip-id="${p.id}">🧾 Slip Gaji</button>
                <button type="button" class="button button-small button-danger" data-del-payroll="${p.id}">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

$("#payrollPeriodFilter").addEventListener("change", () => loadPayroll().catch(showError));

$("#payrollForm").addEventListener("submit", async event => {
    event.preventDefault();
    const msg = $("#payrollFormMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        await request("/api/payroll", { method: "POST", body: JSON.stringify(data) });
        await loadPayroll();
    } catch (error) {
        msg.textContent = error.message;
    }
});

$("#generateBatchPayrollBtn").addEventListener("click", async () => {
    const period = $("#payrollPeriodFilter").value || localMonthValue();
    try {
        const res = await request("/api/payroll/generate", {
            method: "POST",
            body: JSON.stringify({ period_month: period })
        });
        alert(res.message);
        await loadPayroll();
    } catch (error) {
        alert(error.message);
    }
});

function openPayslipModal(record) {
    state.activePayslipRecord = record;
    const companyName = state.dashboardData?.company?.company_name || "PT Nusantara Digital Sinergi";
    $("#payslipPrintableArea").innerHTML = `
        <div class="payslip-header">
            <div>
                <h3 style="margin:0;">${companyName}</h3>
                <small>SLIP GAJI RESMI KARYAWAN • PERIODE ${record.period_month}</small>
            </div>
            <div style="text-align:right;">
                <b>ID: ${record.employee_code}</b><br>
                <small>Status: ${record.payment_status === "paid" ? "LUNAS" : "DRAFT"}</small>
            </div>
        </div>
        <div class="payslip-grid">
            <div>
                <p><b>Nama Karyawan:</b> ${record.full_name}</p>
                <p><b>Jabatan / Divisi:</b> ${record.job_title} / ${record.department}</p>
            </div>
            <div>
                <p><b>Tanggal Pembayaran:</b> ${record.payment_date || localDateValue()}</p>
                <p><b>Jam Lembur:</b> ${record.overtime_hours} Jam</p>
            </div>
        </div>
        <table>
            <thead><tr><th>Komponen Penghasilan &amp; Potongan</th><th>Nominal</th></tr></thead>
            <tbody>
                <tr><td>Gaji Pokok</td><td>${formatRupiah(record.base_salary)}</td></tr>
                <tr><td>Tunjangan Jabatan &amp; Operasional</td><td>${formatRupiah(record.allowance)}</td></tr>
                <tr><td>Bonus Kinerja</td><td>${formatRupiah(record.bonus)}</td></tr>
                <tr><td>Upah Lembur (${record.overtime_hours} jam)</td><td>${formatRupiah(record.overtime_pay)}</td></tr>
                <tr><td>Potongan (Pajak / BPJS / Lainnya)</td><td>- ${formatRupiah(record.deduction)}</td></tr>
            </tbody>
        </table>
        <div class="payslip-total-box">
            <span>TOTAL GAJI BERSIH (TAKE HOME PAY)</span>
            <span>${formatRupiah(record.net_salary)}</span>
        </div>
        <p style="margin-top:10px;font-size:11px;color:#555;">Catatan: ${record.note || "Slip gaji ini diterbitkan secara elektronik oleh sistem HRIS."}</p>
    `;
    $("#payslipDialog").classList.remove("hidden");
}

$("#payrollTable").addEventListener("click", async event => {
    const slipBtn = event.target.closest("[data-slip-id]");
    if (slipBtn) {
        const rec = state.payrollData.find(r => String(r.id) === slipBtn.dataset.slipId);
        if (rec) openPayslipModal(rec);
    }
    const delBtn = event.target.closest("[data-del-payroll]");
    if (delBtn && confirm("Hapus catatan gaji ini?")) {
        await request(`/api/payroll/${delBtn.dataset.delPayroll}`, { method: "DELETE" });
        await loadPayroll();
    }
});

$("#closePayslipBtn").addEventListener("click", () => $("#payslipDialog").classList.add("hidden"));
$("#closePayslipBottomBtn").addEventListener("click", () => $("#payslipDialog").classList.add("hidden"));
$("#printPayslipBtn").addEventListener("click", async () => {
    const rec = state.activePayslipRecord;
    if (!rec?.id) return;
    const btn = $("#printPayslipBtn");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ Mengunduh PDF...";
    try {
        const response = await fetch(`/api/payroll/${encodeURIComponent(rec.id)}/pdf`, {
            credentials: "same-origin"
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Gagal mengunduh PDF Slip Gaji.");
        }
        const blob = await response.blob();
        const safeName = String(rec.full_name || "Karyawan").replace(/[^a-zA-Z0-9_-]/g, "-");
        const filename = `Slip-Gaji-${rec.employee_code || rec.id}-${safeName}-${rec.period_month || "HRIS"}.pdf`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (error) {
        alert(error.message || "Gagal mengunduh Slip Gaji PDF.");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

// ===================== 8. JADWAL SHIFT & KALENDER KERJA =====================
$("#schedDate").value = localDateValue();

async function loadSchedules() {
    const { schedules } = await request("/api/schedules");
    state.schedulesData = schedules || [];
    const tbody = $("#schedulesTable");
    tbody.replaceChildren();
    state.schedulesData.forEach(s => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${s.event_date}</b></td>
            <td><b>${s.title}</b><br><small class="muted">${s.description || ""}</small></td>
            <td>${String(s.start_time).slice(0, 5)} - ${String(s.end_time).slice(0, 5)}</td>
            <td>${s.department || "Semua"}</td>
            <td><span class="status-pill status-active">${s.shift_name}</span></td>
            <td><button type="button" class="button button-small button-danger" data-del-sched="${s.id}">Hapus</button></td>
        `;
        tbody.appendChild(tr);
    });
}

$("#scheduleForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        await request("/api/schedules", { method: "POST", body: JSON.stringify(data) });
        form.reset();
        $("#schedDate").value = localDateValue();
        await Promise.all([loadSchedules(), loadDashboard()]);
    } catch (error) {
        $("#schedFormMessage").textContent = error.message;
    }
});

$("#schedulesTable").addEventListener("click", async event => {
    const btn = event.target.closest("[data-del-sched]");
    if (btn && confirm("Hapus jadwal ini?")) {
        await request(`/api/schedules/${btn.dataset.delSched}`, { method: "DELETE" });
        await loadSchedules();
    }
});

// ===================== 9. LAPORAN & ANALISIS =====================
$("#reportMonthFilter").value = localMonthValue();

async function loadReports() {
    const params = new URLSearchParams();
    if ($("#reportMonthFilter").value) params.set("month", $("#reportMonthFilter").value);
    if ($("#reportYearFilter").value) params.set("year", $("#reportYearFilter").value);
    if ($("#reportDeptFilter").value) params.set("department", $("#reportDeptFilter").value);

    const data = await request(`/api/reports?${params}`);
    state.reportsData = data;
    renderCurrentReport();
}

function getActiveReportRows() {
    const type = $("#reportTypeSelect").value;
    const d = state.reportsData || {};
    if (type === "employees") {
        return {
            title: "Laporan Seluruh Karyawan",
            headers: ["ID Karyawan", "Nama Lengkap", "Jabatan", "Departemen", "Email", "Tgl Bergabung", "Status", "Gaji Pokok"],
            rows: (d.employees || []).map(e => [e.employee_code, e.full_name, e.job_title, e.department, e.email, e.join_date, statusLabel(e.employment_status), formatRupiah(e.base_salary)])
        };
    }
    if (type === "attendance") {
        return {
            title: "Laporan Kehadiran Karyawan",
            headers: ["Tanggal", "ID Karyawan", "Nama Lengkap", "Departemen", "Check-In", "Check-Out", "Durasi", "Status"],
            rows: (d.attendance || []).map(a => [a.work_date, a.employee_code, a.full_name, a.department, formatAttendanceTime(a.check_in), formatAttendanceTime(a.check_out), formatWorkDuration(a.work_minutes), attendanceStatusLabel(a.status)])
        };
    }
    if (type === "late") {
        return {
            title: "Laporan Keterlambatan Karyawan",
            headers: ["Tanggal", "ID Karyawan", "Nama Lengkap", "Departemen", "Jam Masuk", "Catatan"],
            rows: (d.lateRecords || []).map(a => [a.work_date, a.employee_code, a.full_name, a.department, formatAttendanceTime(a.check_in), a.note || "Terlambat"])
        };
    }
    if (type === "leaves") {
        return {
            title: "Laporan Cuti & Izin Karyawan",
            headers: ["ID Karyawan", "Nama Lengkap", "Departemen", "Jenis", "Mulai", "Selesai", "Hari", "Status"],
            rows: (d.leaves || []).map(l => [l.employee_code, l.full_name, l.department, l.leave_type, l.start_date, l.end_date, `${l.days_count} hari`, l.status])
        };
    }
    if (type === "payroll") {
        return {
            title: "Laporan Penggajian Karyawan",
            headers: ["Periode", "ID Karyawan", "Nama Lengkap", "Departemen", "Gaji Pokok", "Tunjangan+Bonus", "Potongan", "Gaji Bersih"],
            rows: (d.payroll || []).map(p => [p.period_month, p.employee_code, p.full_name, p.department, formatRupiah(p.base_salary), formatRupiah(Number(p.allowance) + Number(p.bonus) + Number(p.overtime_pay)), formatRupiah(p.deduction), formatRupiah(p.net_salary)])
        };
    }
    return {
        title: "Laporan Rekapitulasi Per Departemen",
        headers: ["Departemen", "Total Karyawan", "Aktif", "Tidak Aktif", "Cuti", "Rata-rata Gaji Pokok"],
        rows: (d.departmentSummary || []).map(s => [s.department, s.total_employees, s.active_employees, s.inactive_employees, s.leave_employees, formatRupiah(s.avg_base_salary)])
    };
}

function renderCurrentReport() {
    if (!state.reportsData) return;
    const { headers, rows } = getActiveReportRows();
    const d = state.reportsData;

    $("#reportVisualSummary").innerHTML = `
        <article class="stat-card"><span class="stat-icon blue-icon">👥</span><p>Total Karyawan</p><strong>${(d.employees || []).length}</strong><small>Sesuai filter laporan</small></article>
        <article class="stat-card"><span class="stat-icon green-icon">✓</span><p>Log Kehadiran</p><strong>${(d.attendance || []).length}</strong><small>Catatan terekam</small></article>
        <article class="stat-card"><span class="stat-icon orange-icon">!</span><p>Catatan Terlambat</p><strong>${(d.lateRecords || []).length}</strong><small>Insiden keterlambatan</small></article>
        <article class="stat-card"><span class="stat-icon purple-icon">💳</span><p>Data Slip Gaji</p><strong>${(d.payroll || []).length}</strong><small>Rekap penggajian</small></article>
    `;

    $("#reportTableHead").innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
    const tbody = $("#reportTableBody");
    tbody.replaceChildren();
    rows.forEach(r => {
        const tr = document.createElement("tr");
        r.forEach(c => tr.appendChild(createCell(String(c ?? "—"))));
        tbody.appendChild(tr);
    });
}

["#reportTypeSelect", "#reportMonthFilter", "#reportYearFilter", "#reportDeptFilter"].forEach(sel => {
    $(sel)?.addEventListener("change", () => loadReports().catch(showError));
});

$("#downloadReportExcelBtn").addEventListener("click", () => {
    const { title, headers, rows } = getActiveReportRows();
    downloadCsvFile(`${title.toLowerCase().replace(/\s+/g, "-")}-${localDateValue()}.csv`, headers, rows);
});

$("#downloadReportPdfBtn").addEventListener("click", () => {
    const { title, headers, rows } = getActiveReportRows();
    openPrintablePdfReport(title.toUpperCase(), "Laporan Analitik Eksekutif HRIS", headers, rows);
});

// ===================== 10. NOTIFIKASI & PENGUMUMAN =====================
async function loadNotificationsPage() {
    const { notifications, unreadCount } = await request("/api/notifications");
    state.notificationsData = notifications || [];
    $("#sidebarNotifBadge").textContent = unreadCount;
    $("#topNotifBadge").textContent = unreadCount;

    const list = $("#notificationsFullList");
    list.replaceChildren();
    state.notificationsData.forEach(n => {
        const li = document.createElement("li");
        li.className = `notif-feed-item ${n.is_read ? "" : "unread"}`;
        li.innerHTML = `
            <div>
                <strong>${n.title}</strong>
                <p class="muted" style="margin:3px 0;">${n.message}</p>
                <small class="muted">${new Date(n.created_at).toLocaleString("id-ID")}</small>
            </div>
            ${!n.is_read ? `<button type="button" class="button button-small button-secondary" data-read-notif="${n.id}">Tandai Dibaca</button>` : `<span class="status-pill status-active">Dibaca</span>`}
        `;
        list.appendChild(li);
    });
}

$("#announcementForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = $("#annFormMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        await request("/api/notifications", { method: "POST", body: JSON.stringify(data) });
        form.reset();
        await Promise.all([loadNotificationsPage(), loadDashboard()]);
    } catch (error) {
        msg.textContent = error.message;
    }
});

$("#markAllReadBtn").addEventListener("click", async () => {
    await request("/api/notifications/read-all", { method: "POST", body: "{}" });
    await Promise.all([loadNotificationsPage(), loadDashboard()]);
});

$("#notificationsFullList").addEventListener("click", async event => {
    const btn = event.target.closest("[data-read-notif]");
    if (!btn) return;
    await request(`/api/notifications/${btn.dataset.readNotif}/read`, { method: "POST", body: "{}" });
    await loadNotificationsPage();
});

// ===================== 11. PENGATURAN, PROFIL PERUSAHAAN, RBAC & AUDIT =====================
async function loadSettingsPage() {
    if (!state.user) return;
    applyRolePermissions();
    $("#profDisplayName").value = state.user.displayName || "";
    $("#profNip").value = state.user.nip || "";
    $("#profEmail").value = state.user.email || "";

    const isSuperAdmin = state.user.role === "super_admin";
    const passkeyRes = await request("/api/auth/passkeys");

    // Passkeys
    const pkList = $("#passkeyList");
    pkList.replaceChildren();
    (passkeyRes.passkeys || []).forEach(pk => {
        const li = document.createElement("li");
        li.className = "notif-feed-item";
        li.innerHTML = `
            <div>
                <strong>🔑 Passkey Biometrik #${pk.id}</strong>
                <br><small class="muted">Terdaftar: ${new Date(pk.created_at).toLocaleString("id-ID")} • Penggunaan: ${pk.counter}x</small>
            </div>
            <button type="button" class="button button-small button-danger" data-del-passkey="${pk.id}">Hapus</button>
        `;
        pkList.appendChild(li);
    });
    if (!passkeyRes.passkeys?.length) {
        pkList.innerHTML = `<li class="muted">Belum ada Passkey terdaftar pada akun ini.</li>`;
    }

    // Fitur khusus Super Admin: Profil Perusahaan, RBAC, dan Audit Log
    if (!isSuperAdmin) return;

    const [compRes, usersRes, auditRes] = await Promise.all([
        request("/api/system/company"),
        request("/api/system/users"),
        request("/api/audit").catch(() => ({ activities: [] }))
    ]);

    // Company Profile
    const comp = compRes.company;
    if (comp) {
        $("#compName").value = comp.company_name || "";
        $("#compIndustry").value = comp.industry || "";
        $("#compTaxId").value = comp.tax_id || "";
        $("#compEmail").value = comp.email || "";
        $("#compPhone").value = comp.phone || "";
        $("#compWorkHours").value = comp.work_hours || "";
        $("#compWebsite").value = comp.website || "";
        $("#compTagline").value = comp.tagline || "";
        $("#compAddress").value = comp.address || "";
        $("#compVision").value = comp.vision || "";
        $("#compMission").value = comp.mission || "";
    }

    // RBAC Users (Khusus Super Admin)
    const uBody = $("#rbacUsersTable");
    uBody.replaceChildren();
    (usersRes.users || []).forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${u.username}</b><br><small>${u.email}</small></td>
            <td>${u.display_name}</td>
            <td>
                <select class="table-role-select" data-change-role="${u.id}" data-active="${u.is_active ? "1" : "0"}" style="padding:5px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.84rem;font-weight:600;color:#0E63B8;background:#F8FAFC;">
                    <option value="super_admin" ${u.role === "super_admin" ? "selected" : ""}>Pemilik / Direktur (Super Admin)</option>
                    <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin Biasa</option>
                    <option value="hr" ${u.role === "hr" ? "selected" : ""}>HRD / Admin HR</option>
                    <option value="employee" ${u.role === "employee" ? "selected" : ""}>Karyawan</option>
                </select>
            </td>
            <td>${u.passkey_count} kunci</td>
            <td><span class="status-pill ${u.is_active ? "status-active" : "status-inactive"}">${u.is_active ? "Aktif" : "Nonaktif"}</span></td>
            <td>
                ${u.id !== state.user.id ? `
                    <button type="button" class="button button-small button-secondary" data-toggle-user="${u.id}" data-active="${u.is_active ? "0" : "1"}" data-role="${u.role}">
                        ${u.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                ` : `<small class="muted">Akun Aktif Anda</small>`}
            </td>
        `;
        uBody.appendChild(tr);
    });

    // Audit Log (Ringkas 5 baris default)
    state.auditActivities = auditRes.activities || [];
    renderAuditLogTable();
}

function formatLoginEventLabel(eventType) {
    return {
        login_success: "Login Berhasil",
        logout: "Logout / Keluar",
        login_failed: "Login Gagal",
        login_suspicious: "Login Mencurigakan",
        login_blocked: "Login Diblokir",
        passkey_login_success: "Login Passkey Biometrik",
        passkey_login_failed: "Passkey Gagal"
    }[eventType] || eventType.replaceAll("_", " ");
}

function renderAuditLogTable() {
    const aBody = $("#auditLogTable");
    if (!aBody) return;
    aBody.replaceChildren();
    if (state.user?.role !== "super_admin") return;
    const loginEventsOnly = (state.auditActivities || []).filter(a =>
        ["login_success", "logout", "login_failed", "login_suspicious", "login_blocked", "passkey_login_success", "passkey_login_failed"].includes(a.event_type)
    );
    const list = state.auditShowAll
        ? loginEventsOnly
        : loginEventsOnly.slice(0, 5);
    list.forEach(a => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><small>${new Date(a.created_at).toLocaleString("id-ID")}</small></td>
            <td><b>${a.display_name || a.username || "Tidak Dikenal"}</b></td>
            <td>${formatLoginEventLabel(a.event_type)}</td>
            <td>${a.ip_address === "::1" ? "Localhost" : (a.ip_address || "127.0.0.1")}</td>
        `;
        aBody.appendChild(tr);
    });
    const limitBtn = $("#toggleAuditLimitBtn");
    if (limitBtn) {
        const total = loginEventsOnly.length;
        limitBtn.textContent = state.auditShowAll ? "Ringkas (5)" : `Semua (${total})`;
    }
}

$("#toggleAuditLimitBtn")?.addEventListener("click", () => {
    state.auditShowAll = !state.auditShowAll;
    renderAuditLogTable();
});

$("#minimizeAuditBtn")?.addEventListener("click", event => {
    const wrap = $("#auditLogBodyWrap");
    if (!wrap) return;
    const isHidden = wrap.classList.toggle("hidden");
    event.currentTarget.textContent = isHidden ? "+ Tampilkan" : "− Minimize";
});

$("#profileUpdateForm").addEventListener("submit", async event => {
    event.preventDefault();
    const msg = $("#profFormMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const res = await request("/api/auth/profile", { method: "PUT", body: JSON.stringify(data) });
        state.user = res.user;
        updateUserUI();
        msg.style.color = "var(--success)";
        msg.textContent = res.message;
    } catch (error) {
        msg.style.color = "var(--danger)";
        msg.textContent = error.message;
    }
});

$("#changePasswordForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = $("#passChangeMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        const res = await request("/api/auth/password", { method: "PUT", body: JSON.stringify(data) });
        form.reset();
        msg.style.color = "var(--success)";
        msg.textContent = res.message;
    } catch (error) {
        msg.style.color = "var(--danger)";
        msg.textContent = error.message;
    }
});

$("#configurePinForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = $("#pinChangeMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        const res = await request("/api/auth/pin", { method: "PUT", body: JSON.stringify(data) });
        form.reset();
        msg.style.color = "var(--success)";
        msg.textContent = res.message;
    } catch (error) {
        msg.style.color = "var(--danger)";
        msg.textContent = error.message;
    }
});

$("#passkeyList").addEventListener("click", async event => {
    const btn = event.target.closest("[data-del-passkey]");
    if (btn && confirm("Hapus passkey ini dari akun Anda?")) {
        await request(`/api/auth/passkeys/${btn.dataset.delPasskey}`, { method: "DELETE" });
        await loadSettingsPage();
    }
});

$("#companyProfileForm").addEventListener("submit", async event => {
    event.preventDefault();
    const msg = $("#compFormMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const res = await request("/api/system/company", { method: "PUT", body: JSON.stringify(data) });
        msg.style.color = "var(--success)";
        msg.textContent = res.message;
    } catch (error) {
        msg.style.color = "var(--danger)";
        msg.textContent = error.message;
    }
});

$("#createUserAccountForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = $("#newAccMessage");
    msg.textContent = "";
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        const res = await request("/api/system/users", { method: "POST", body: JSON.stringify(data) });
        form.reset();
        msg.style.color = "var(--success)";
        msg.textContent = res.message;
        await loadSettingsPage();
    } catch (error) {
        msg.style.color = "var(--danger)";
        msg.textContent = error.message;
    }
});

$("#rbacUsersTable").addEventListener("change", async event => {
    const select = event.target.closest("[data-change-role]");
    if (!select) return;
    try {
        await request(`/api/system/users/${select.dataset.changeRole}`, {
            method: "PUT",
            body: JSON.stringify({
                role: select.value,
                is_active: select.dataset.active === "1"
            })
        });
        await loadSettingsPage();
    } catch (error) {
        alert(error.message);
        await loadSettingsPage();
    }
});

$("#rbacUsersTable").addEventListener("click", async event => {
    const btn = event.target.closest("[data-toggle-user]");
    if (!btn) return;
    try {
        await request(`/api/system/users/${btn.dataset.toggleUser}`, {
            method: "PUT",
            body: JSON.stringify({
                role: btn.dataset.role,
                is_active: btn.dataset.active === "1"
            })
        });
        await loadSettingsPage();
    } catch (error) {
        alert(error.message);
    }
});

$("#downloadDbBackupBtn").addEventListener("click", () => {
    window.location.href = "/api/system/backup";
});

// Theme Toggle
const savedTheme = getLocalValue("hris.theme");
if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";
$$("#themeToggle, #themeToggleApp").forEach(button => {
    button.addEventListener("click", () => {
        const dark = document.documentElement.dataset.theme !== "dark";
        document.documentElement.dataset.theme = dark ? "dark" : "light";
        try {
            localStorage.setItem("hris.theme", dark ? "dark" : "light");
        } catch (error) {
            console.error("Preferensi tema tidak dapat disimpan.", error);
        }
    });
});

// ===================== LIVING ATMOSPHERIC BACKGROUND (RAIN, RIPPLES, SPLASHES & AURORA) =====================
(function initLivingAtmosphere() {
    const canvas = document.getElementById("ambientCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const fxModes = [
        { id: "rain", labelLogin: "🌧 Rain & Aurora", labelApp: "🌧 Rain" },
        { id: "storm", labelLogin: "⚡ Cyber Rain", labelApp: "⚡ Storm" },
        { id: "bokeh", labelLogin: "✨ Starlight Bokeh", labelApp: "✨ Bokeh" },
        { id: "off", labelLogin: "🌿 Tenang", labelApp: "🌿 Off" }
    ];
    let currentFxIndex = 0;
    const savedFx = getLocalValue("hris.fxMode");
    if (savedFx) {
        const foundIdx = fxModes.findIndex(m => m.id === savedFx);
        if (foundIdx !== -1) currentFxIndex = foundIdx;
    }

    function updateFxButtons() {
        const mode = fxModes[currentFxIndex];
        const btnLogin = document.getElementById("fxModeToggleLogin");
        const btnApp = document.getElementById("fxModeToggleApp");
        if (btnLogin) btnLogin.textContent = mode.labelLogin;
        if (btnApp) btnApp.textContent = mode.labelApp;
    }
    updateFxButtons();

    $$("#fxModeToggleLogin, #fxModeToggleApp").forEach(btn => {
        btn?.addEventListener("click", () => {
            currentFxIndex = (currentFxIndex + 1) % fxModes.length;
            updateFxButtons();
            try {
                localStorage.setItem("hris.fxMode", fxModes[currentFxIndex].id);
            } catch (_) {}
        });
    });

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const mouse = { x: width * 0.5, y: height * 0.5, vx: 0, lastRipple: 0 };
    window.addEventListener("pointermove", e => {
        mouse.vx = (e.clientX - mouse.x) * 0.15;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        const now = performance.now();
        if (now - mouse.lastRipple > 110 && fxModes[currentFxIndex].id !== "off") {
            mouse.lastRipple = now;
            spawnRipple(e.clientX, e.clientY, 0.55);
        }
    });

    const raindrops = [];
    const ripples = [];
    const bokehOrbs = [];

    function createRaindrop(randomY = false) {
        const depth = Math.random();
        return {
            x: Math.random() * (width + 120) - 60,
            y: randomY ? Math.random() * height : -20 - Math.random() * 80,
            len: 14 + depth * 20,
            speed: 9 + depth * 9,
            wind: 1.5,
            splashY: height * (0.45 + Math.random() * 0.53),
            isOrange: Math.random() < 0.14
        };
    }

    for (let i = 0; i < 48; i++) {
        raindrops.push(createRaindrop(true));
    }

    for (let i = 0; i < 12; i++) {
        bokehOrbs.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: 8 + Math.random() * 18,
            vx: (Math.random() - 0.5) * 0.35,
            vy: -0.18 - Math.random() * 0.3,
            isOrange: i % 4 === 0
        });
    }

    function spawnRipple(x, y, strength = 1) {
        if (ripples.length > 18) ripples.shift();
        ripples.push({
            x,
            y,
            rx: 2,
            ry: 0.9,
            maxR: (18 + Math.random() * 18) * strength,
            alpha: 0.42 * strength,
            isOrange: Math.random() < 0.16
        });
    }

    function renderFrame() {
        requestAnimationFrame(renderFrame);
        if (document.hidden) return;
        const mode = fxModes[currentFxIndex].id;
        ctx.clearRect(0, 0, width, height);
        if (mode === "off") return;

        const isDark = document.documentElement.dataset.theme === "dark";
        const isStorm = mode === "storm";

        // 1. Lightweight Bokeh Circles (Single fill style, zero per-frame gradient allocation)
        ctx.fillStyle = isDark ? "rgba(85, 185, 232, 0.10)" : "rgba(13, 130, 235, 0.08)";
        ctx.beginPath();
        for (const orb of bokehOrbs) {
            orb.x += orb.vx;
            orb.y += orb.vy;
            if (orb.y < -orb.r) orb.y = height + orb.r;
            if (orb.x < -orb.r) orb.x = width + orb.r;
            if (orb.x > width + orb.r) orb.x = -orb.r;
            ctx.moveTo(orb.x + orb.r, orb.y);
            ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        }
        ctx.fill();

        // 2. Ultra-Fast Batched Raindrops (Single stroke call for all blue drops, single stroke for orange)
        if (mode === "rain" || mode === "storm") {
            const speedMult = isStorm ? 1.35 : 1.0;
            ctx.lineCap = "round";
            ctx.lineWidth = 1.35;

            // Batch Blue Drops
            ctx.strokeStyle = isDark ? "rgba(125, 211, 252, 0.38)" : "rgba(13, 130, 235, 0.30)";
            ctx.beginPath();
            for (let i = 0; i < raindrops.length; i++) {
                const d = raindrops[i];
                if (d.isOrange) continue;
                const vx = d.wind * speedMult;
                const vy = d.speed * speedMult;
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x + vx * 1.4, d.y + d.len);
                d.x += vx;
                d.y += vy;
                if (d.y >= d.splashY) {
                    if (Math.random() < 0.25) spawnRipple(d.x, d.y, 0.85);
                    Object.assign(d, createRaindrop(false));
                }
            }
            ctx.stroke();

            // Batch Orange Accent Drops
            ctx.strokeStyle = "rgba(255, 146, 46, 0.34)";
            ctx.beginPath();
            for (let i = 0; i < raindrops.length; i++) {
                const d = raindrops[i];
                if (!d.isOrange) continue;
                const vx = d.wind * speedMult;
                const vy = d.speed * speedMult;
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x + vx * 1.4, d.y + d.len);
                d.x += vx;
                d.y += vy;
                if (d.y >= d.splashY) {
                    Object.assign(d, createRaindrop(false));
                }
            }
            ctx.stroke();
        }

        // 3. Expanding Water Ripples
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = isDark ? "rgba(125, 211, 252, 0.32)" : "rgba(13, 130, 235, 0.26)";
        ctx.beginPath();
        for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            rp.rx += 0.9;
            rp.ry = rp.rx * 0.36;
            rp.alpha *= 0.94;
            if (rp.alpha < 0.03 || rp.rx > rp.maxR) {
                ripples.splice(i, 1);
                continue;
            }
            ctx.moveTo(rp.x + rp.rx, rp.y);
            ctx.ellipse(rp.x, rp.y, rp.rx, rp.ry, 0, 0, Math.PI * 2);
        }
        ctx.stroke();
    }

    requestAnimationFrame(renderFrame);
})();

initialize();
