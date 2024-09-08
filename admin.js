import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const db = getFirestore();

const ADMIN_USERNAME = 'admin';
let ADMIN_PASSWORD = localStorage.getItem('ADMIN_PASSWORD') || 'password';

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        await loadPendingRequests();
        await loadCurrentBookings();
    } else {
        alert('用戶名或密碼錯誤！');
    }
}

function logout() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function changeAdminPassword() {
    const currentPassword = prompt("請輸入當前密碼：");
    if (currentPassword !== ADMIN_PASSWORD) {
        alert("當前密碼錯誤！");
        return;
    }

    const newPassword = prompt("請輸入新密碼：");
    const confirmPassword = prompt("請再次輸入新密碼：");

    if (newPassword !== confirmPassword) {
        alert("兩次輸入的新密碼不一致！");
        return;
    }

    ADMIN_PASSWORD = newPassword;
    localStorage.setItem('ADMIN_PASSWORD', ADMIN_PASSWORD);
    alert("密碼已成功更改！");
}

async function loadPendingRequests() {
    const table = document.getElementById('requestsTable').getElementsByTagName('tbody')[0];
    table.innerHTML = '';

    const pendingRequestsRef = collection(db, "pendingRequests");
    const querySnapshot = await getDocs(pendingRequestsRef);

    querySnapshot.forEach((doc) => {
        const request = doc.data();
        const row = table.insertRow();
        row.innerHTML = `
            <td>${request.name}</td>
            <td>${request.class}</td>
            <td>${request.date}</td>
            <td>${request.periods.join(", ")}</td>
            <td>${request.tablets}</td>
            <td>
                <button onclick="approveRequest('${doc.id}')">批准</button>
                <button onclick="rejectRequest('${doc.id}')">拒絕</button>
            </td>
        `;
    });
}

async function approveRequest(docId) {
    const docRef = doc(db, "pendingRequests", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const request = docSnap.data();
        await setDoc(doc(db, "bookings", docId), request);
        await deleteDoc(docRef);
        alert('申請已批准');
        await loadPendingRequests();
        await loadCurrentBookings();
    }
}

async function rejectRequest(docId) {
    await deleteDoc(doc(db, "pendingRequests", docId));
    alert('申請已拒絕');
    await loadPendingRequests();
}

async function loadCurrentBookings() {
    const table = document.getElementById('currentBookingsTable').getElementsByTagName('tbody')[0];
    table.innerHTML = '';

    const bookingsRef = collection(db, "bookings");
    const querySnapshot = await getDocs(bookingsRef);

    const bookings = {};
    querySnapshot.forEach((doc) => {
        const booking = doc.data();
        if (!bookings[booking.date]) {
            bookings[booking.date] = {};
        }
        booking.periods.forEach(period => {
            if (!bookings[booking.date][period]) {
                bookings[booking.date][period] = 0;
            }
            bookings[booking.date][period] += booking.tablets;
        });
    });

    for (const date in bookings) {
        for (const period in bookings[date]) {
            const row = table.insertRow();
            row.innerHTML = `
                <td>${date}</td>
                <td>${period}</td>
                <td>${bookings[date][period]}</td>
                <td>
                    <button onclick="cancelBooking('${date}', '${period}')">取消預約</button>
                </td>
            `;
        }
    }
}

async function cancelBooking(date, period) {
    const bookingsRef = collection(db, "bookings");
    const q = query(bookingsRef, where("date", "==", date), where("periods", "array-contains", period));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(async (document) => {
        const booking = document.data();
        const updatedPeriods = booking.periods.filter(p => p !== period);
        if (updatedPeriods.length === 0) {
            await deleteDoc(doc(db, "bookings", document.id));
        } else {
            await setDoc(doc(db, "bookings", document.id), { ...booking, periods: updatedPeriods });
        }
    });

    alert('預約已取消');
    await loadCurrentBookings();
}

window.login = login;
window.logout = logout;
window.changeAdminPassword = changeAdminPassword;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.cancelBooking = cancelBooking;

// 初始加載
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadPendingRequests();
        loadCurrentBookings();
    }
});