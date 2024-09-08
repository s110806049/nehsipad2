import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// 您的 Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyDaPwu1h1U8omiz1HnU8cIDSMCz-kadmc0",
    authDomain: "tablet-d4d0e.firebaseapp.com",
    projectId: "tablet-d4d0e",
    storageBucket: "tablet-d4d0e.appspot.com",
    messagingSenderId: "51579380236",
    appId: "1:51579380236:web:60c806804b1c8c366b0429",
    measurementId: "G-39P037VLGL"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 加載預約數據
async function loadBookings() {
    const bookingsRef = collection(db, "bookings");
    const querySnapshot = await getDocs(bookingsRef);
    const bookedDates = {};
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!bookedDates[data.date]) {
            bookedDates[data.date] = {};
        }
        data.periods.forEach(period => {
            bookedDates[data.date][period] = (bookedDates[data.date][period] || 0) + data.tablets;
        });
    });
    
    updateCalendar(bookedDates);
}

// 更新日曆
function updateCalendar(bookedDates) {
    $('#calendar').fullCalendar('removeEvents');
    for (const date in bookedDates) {
        for (const period in bookedDates[date]) {
            const startTime = getTimeForPeriod(period);
            const endTime = getEndTimeForPeriod(period);
            $('#calendar').fullCalendar('renderEvent', {
                title: `${startTime}-${endTime} ${bookedDates[date][period]}臺預約`,
                start: `${date}T${startTime}`,
                end: `${date}T${endTime}`,
                allDay: false
            }, true);
        }
    }
}

// 獲取時段的開始時間
function getTimeForPeriod(period) {
    const times = {
        '1': '08:40:00', '2': '09:30:00', '3': '10:30:00', '4': '11:20:00',
        '5': '13:30:00', '6': '14:20:00', '7': '15:10:00'
    };
    return times[period];
}

// 獲取時段的結束時間
function getEndTimeForPeriod(period) {
    const endTimes = {
        '1': '09:20:00', '2': '10:10:00', '3': '11:10:00', '4': '12:00:00',
        '5': '14:10:00', '6': '15:00:00', '7': '15:50:00'
    };
    return endTimes[period];
}

// 初始化 FullCalendar
$(document).ready(function() {
    $('#calendar').fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
        },
        defaultView: 'month',
        editable: false,
        eventLimit: true,
        events: function(start, end, timezone, callback) {
            loadBookings().then(() => {
                callback($('#calendar').fullCalendar('clientEvents'));
            });
        }
    });
});

// 提交預約申請
document.getElementById("bookingForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const bookingData = {
        name: document.getElementById("name").value,
        class: document.getElementById("class").value,
        date: document.getElementById("date").value,
        periods: Array.from(document.getElementById("periods").selectedOptions).map(option => option.value),
        tablets: parseInt(document.getElementById("tablets").value),
        status: 'pending'
    };

    try {
        // 檢查是否超過可預約數量
        const bookingsRef = collection(db, "bookings");
        const q = query(bookingsRef, where("date", "==", bookingData.date));
        const querySnapshot = await getDocs(q);
        let existingTablets = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            data.periods.forEach(period => {
                existingTablets[period] = (existingTablets[period] || 0) + data.tablets;
            });
        });

        for (let period of bookingData.periods) {
            if ((existingTablets[period] || 0) + bookingData.tablets > 30) {
                alert(`第${period}節已預約${existingTablets[period] || 0}臺平板，剩餘可預約數量不足！`);
                return;
            }
        }

        // 添加預約申請
        await addDoc(collection(db, "pendingRequests"), bookingData);
        alert("預約申請已提交，等待管理員審核！");
        this.reset(); // 重置表單
        loadBookings(); // 重新加載預約數據
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("提交失敗，請稍後再試。");
    }
});

// 在頁面加載時調用 loadBookings
document.addEventListener('DOMContentLoaded', loadBookings);