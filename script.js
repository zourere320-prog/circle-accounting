/* =====================================================
   Circle Accounting
   Firebase Firestore + LocalStorage
   Stable Version
===================================================== */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =====================================================
   Firebase設定
===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyAvDWjqiv4G-fMW3_ovTtDLXT-514Q5TX8",
    authDomain: "circle-accounting-b2194.firebaseapp.com",
    projectId: "circle-accounting-b2194",
    storageBucket: "circle-accounting-b2194.firebasestorage.app",
    messagingSenderId: "122808479714",
    appId: "1:122808479714:web:b4f74aa3412064bee653bb"
};


/* =====================================================
   Firebase初期化
===================================================== */

let db = null;
let firebaseReady = false;
let cloudDataRef = null;

try {

    const firebaseApp =
        initializeApp(firebaseConfig);

    db =
        getFirestore(firebaseApp);

    cloudDataRef =
        doc(
            db,
            "circleAccounting",
            "main"
        );

    firebaseReady = true;

    console.log(
        "🔥 Firebase初期化成功"
    );

}
catch (error) {

    console.error(
        "Firebase初期化エラー:",
        error
    );

    firebaseReady = false;
    db = null;
    cloudDataRef = null;

}


/* =====================================================
   Firebase状態
===================================================== */

let cloudLoading = false;
let cloudSaving = false;


/*
    Firebase保存が連続して呼ばれた場合に
    最後の変更を取りこぼさないためのフラグ
*/
let cloudSaveQueued = false;


/* =====================================================
   初期グループ
===================================================== */

const DEFAULT_GROUPS = [

    {
        id: 1,
        name: "未所属",
        color: "#dbeafe"
    }

];


/* =====================================================
   初期データ
===================================================== */

const DEFAULT_DATA = {

    events: [

        {
            id: 1,
            name: "新歓",
            fee: 3000,
            members: {},
            income: [],
            expenses: []
        }

    ],

    members: [

        {
            id: 1,
            name: "田中太郎",
            groupId: 1
        },

        {
            id: 2,
            name: "佐藤花子",
            groupId: 1
        },

        {
            id: 3,
            name: "鈴木一郎",
            groupId: 1
        },

        {
            id: 4,
            name: "高橋健太",
            groupId: 1
        },

        {
            id: 5,
            name: "伊藤美咲",
            groupId: 1
        },

        {
            id: 6,
            name: "山田翔",
            groupId: 1
        }

    ],

    groups:
        structuredClone(DEFAULT_GROUPS),

    currentEventId: 1

};


/* =====================================================
   LocalStorage読み込み
===================================================== */

function loadLocalData() {

    const saved =
        localStorage.getItem(
            "circleAccounting"
        );

    if (!saved) {

        return structuredClone(
            DEFAULT_DATA
        );

    }

    try {

        const parsed =
            JSON.parse(saved);

        normalizeData(parsed);

        return parsed;

    }
    catch (error) {

        console.error(
            "LocalStorage読み込みエラー:",
            error
        );

        return structuredClone(
            DEFAULT_DATA
        );

    }

}


/* =====================================================
   データ整形
===================================================== */

function normalizeData(target) {

    if (
        !target ||
        typeof target !== "object"
    ) {

        return;

    }


    if (!Array.isArray(target.groups)) {

        target.groups =
            structuredClone(
                DEFAULT_GROUPS
            );

    }


    /*
        未所属グループが存在しない場合は追加
    */

    if (
        !target.groups.some(
            group =>
                Number(group.id) === 1
        )
    ) {

        target.groups.unshift(
            structuredClone(
                DEFAULT_GROUPS[0]
            )
        );

    }


    if (!Array.isArray(target.members)) {

        target.members = [];

    }


    if (!Array.isArray(target.events)) {

        target.events = [];

    }


    target.members.forEach(
        member => {

            if (
                !member.groupId ||
                !target.groups.some(
                    group =>
                        Number(group.id) ===
                        Number(member.groupId)
                )
            ) {

                member.groupId = 1;

            }

        }
    );


    target.events.forEach(
        event => {

            if (
                !event.members ||
                typeof event.members !== "object"
            ) {

                event.members = {};

            }


            if (!Array.isArray(event.income)) {

                event.income = [];

            }


            if (!Array.isArray(event.expenses)) {

                event.expenses = [];

            }


            if (
                typeof event.fee !== "number"
            ) {

                event.fee =
                    Number(event.fee) || 0;

            }

        }
    );


    if (
        target.events.length > 0
    ) {

        const currentExists =
            target.events.some(
                event =>
                    Number(event.id) ===
                    Number(target.currentEventId)
            );


        if (!currentExists) {

            target.currentEventId =
                target.events[0].id;

        }

    }
    else {

        target.currentEventId = null;

    }

}


/* =====================================================
   現在のデータ
===================================================== */

let data =
    loadLocalData();

normalizeData(data);


/* =====================================================
   LocalStorage保存
===================================================== */

function saveLocalOnly() {

    try {

        localStorage.setItem(
            "circleAccounting",
            JSON.stringify(data)
        );

        return true;

    }
    catch (error) {

        console.error(
            "LocalStorage保存エラー:",
            error
        );

        return false;

    }

}


/* =====================================================
   クラウド状態表示
===================================================== */

function showCloudStatus(message) {

    let status =
        document.getElementById(
            "cloudStatus"
        );


    if (!status) {

        status =
            document.createElement(
                "div"
            );

        status.id =
            "cloudStatus";


        status.style.position =
            "fixed";

        status.style.right =
            "15px";

        status.style.bottom =
            "15px";

        status.style.zIndex =
            "99999";

        status.style.padding =
            "9px 13px";

        status.style.borderRadius =
            "10px";

        status.style.background =
            "#111827";

        status.style.color =
            "white";

        status.style.fontSize =
            "12px";

        status.style.fontWeight =
            "bold";

        status.style.boxShadow =
            "0 4px 12px rgba(0,0,0,0.2)";

        status.style.transition =
            "opacity .3s";

        document.body.appendChild(
            status
        );

    }


    status.textContent =
        message;

    status.style.opacity =
        "1";


    clearTimeout(
        status._timer
    );


    status._timer =
        setTimeout(
            () => {

                status.style.opacity =
                    "0.75";

            },
            3000
        );

}


/* =====================================================
   Firebase保存
===================================================== */

async function saveToCloud() {

    if (
        !firebaseReady ||
        !cloudDataRef
    ) {

        return false;

    }


    /*
        保存中なら、次の保存を予約
    */

    if (cloudSaving) {

        cloudSaveQueued = true;

        return false;

    }


    cloudSaving = true;
    cloudSaveQueued = false;


    try {

        /*
            保存直前のデータをコピー
        */

        const dataToSave =
            structuredClone(data);


        await setDoc(

            cloudDataRef,

            {
                data:
                    dataToSave,

                updatedAt:
                    new Date().toISOString()

            }

        );


        console.log(
            "☁️ Firestore保存成功"
        );


        showCloudStatus(
            "☁️ クラウド保存済み"
        );


        return true;

    }
    catch (error) {

        console.error(
            "Firestore保存エラー:",
            error
        );


        showCloudStatus(
            "📱 ローカル保存済み"
        );


        return false;

    }
    finally {

        cloudSaving = false;


        /*
            保存中に別の変更が入った場合、
            最新状態をもう一度保存
        */

        if (cloudSaveQueued) {

            cloudSaveQueued = false;

            setTimeout(
                () => {

                    saveToCloud();

                },
                0
            );

        }

    }

}


/* =====================================================
   クラウド読み込み
===================================================== */

async function loadFromCloud() {

    if (
        !firebaseReady ||
        !cloudDataRef
    ) {

        return false;

    }


    cloudLoading = true;


    try {

        const snapshot =
            await getDoc(
                cloudDataRef
            );


        if (snapshot.exists()) {

            const cloud =
                snapshot.data();


            if (
                cloud &&
                cloud.data
            ) {

                data =
                    cloud.data;


                normalizeData(
                    data
                );


                saveLocalOnly();


                console.log(
                    "☁️ Firestoreデータ読み込み成功"
                );


                showCloudStatus(
                    "☁️ クラウドデータを読み込みました"
                );


                return true;

            }

        }
        else {

            /*
                Firestoreにデータがない場合のみ
                現在のローカルデータを初回保存
            */

            await saveToCloud();

        }

        return false;

    }
    catch (error) {

        console.error(
            "Firestore読み込みエラー:",
            error
        );


        showCloudStatus(
            "📱 オフラインモード"
        );


        return false;

    }
    finally {

        cloudLoading = false;

    }

}


/* =====================================================
   通常保存
===================================================== */

function saveData() {

    /*
        まず必ずローカル保存
    */

    saveLocalOnly();


    /*
        Firebase保存
    */

    if (
        firebaseReady &&
        !cloudLoading
    ) {

        saveToCloud();

    }


    updateOverallFinance();

}


/* =====================================================
   現在の会計
===================================================== */

function getCurrentEvent() {

    if (
        !data ||
        !Array.isArray(data.events)
    ) {

        return null;

    }


    return data.events.find(
        event =>
            Number(event.id) ===
            Number(data.currentEventId)
    ) || null;

}


/* =====================================================
   初期化
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /*
            まずローカルデータで表示
        */

        renderAll();


        /*
            Firebaseから最新データ取得
        */

        await loadFromCloud();


        /*
            クラウド取得後に再描画
        */

        renderAll();


        console.log(
            "☁️ Circle Accounting 起動完了"
        );

    }
);


/* =====================================================
   全画面再描画
===================================================== */

function renderAll() {

    renderEvents();

    renderGroups();

    renderGroupFilter();

    renderMembers();

    renderFinance();

    updateStats();

    updateOverallFinance();

    calculateCustom();

}


/* =====================================================
   会計表示
===================================================== */

function renderEvents() {

    const container =
        document.getElementById(
            "eventList"
        );


    if (!container) return;


    container.innerHTML = "";


    data.events.forEach(
        event => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "event-card " +
                (
                    Number(event.id) ===
                    Number(data.currentEventId)
                        ? "active"
                        : ""
                );


            card.onclick = () => {

                data.currentEventId =
                    event.id;

                saveData();

                renderAll();

            };


            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "event-name";

            name.textContent =
                event.name;


            const fee =
                document.createElement(
                    "div"
                );

            fee.className =
                "event-fee";

            fee.textContent =
                "参加費 ¥" +
                Number(event.fee)
                    .toLocaleString();


            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "delete-event";

            deleteButton.textContent =
                "×";


            deleteButton.onclick =
                e => {

                    e.stopPropagation();

                    deleteEvent(
                        event.id
                    );

                };


            card.appendChild(
                name
            );

            card.appendChild(
                fee
            );

            card.appendChild(
                deleteButton
            );


            container.appendChild(
                card
            );

        }
    );


    const currentEvent =
        getCurrentEvent();


    if (currentEvent) {

        const eventName =
            document.getElementById(
                "currentEventName"
            );


        const currentFee =
            document.getElementById(
                "currentFee"
            );


        if (eventName) {

            eventName.textContent =
                currentEvent.name;

        }


        if (currentFee) {

            currentFee.textContent =
                "¥" +
                Number(
                    currentEvent.fee
                ).toLocaleString();

        }

    }

}


/* =====================================================
   会計追加
===================================================== */

function addEvent() {

    const name =
        prompt(
            "会計の目的を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const feeInput =
        prompt(
            "1人あたりの金額を入力してください",
            "3000"
        );


    if (feeInput === null) return;


    const fee =
        Number(feeInput);


    if (
        !Number.isFinite(fee) ||
        fee < 0
    ) {

        alert(
            "金額を正しく入力してください"
        );

        return;

    }


    const newEvent = {

        id:
            Date.now(),

        name:
            name.trim(),

        fee:
            fee,

        members: {},

        income: [],

        expenses: []

    };


    data.events.push(
        newEvent
    );


    data.currentEventId =
        newEvent.id;


    saveData();

    renderAll();

}


/* =====================================================
   会計削除
===================================================== */

function deleteEvent(id) {

    if (
        data.events.length <= 1
    ) {

        alert(
            "会計は最低1つ必要です"
        );

        return;

    }


    const event =
        data.events.find(
            e =>
                Number(e.id) ===
                Number(id)
        );


    if (!event) return;


    if (
        !confirm(
            `「${event.name}」を削除しますか？`
        )
    ) return;


    data.events =
        data.events.filter(
            e =>
                Number(e.id) !==
                Number(id)
        );


    if (
        Number(data.currentEventId) ===
        Number(id)
    ) {

        data.currentEventId =
            data.events[0].id;

    }


    saveData();

    renderAll();

}


/* =====================================================
   グループ表示
===================================================== */

function renderGroups() {

    const container =
        document.getElementById(
            "groupList"
        );


    if (!container) return;


    container.innerHTML = "";


    data.groups.forEach(
        group => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "group-card";


            const color =
                document.createElement(
                    "div"
                );

            color.className =
                "group-color";

            color.style.background =
                group.color;


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "group-name";

            name.textContent =
                group.name;


            const count =
                data.members.filter(
                    member =>
                        Number(member.groupId) ===
                        Number(group.id)
                ).length;


            const countElement =
                document.createElement(
                    "span"
                );

            countElement.className =
                "group-count";

            countElement.textContent =
                count + "人";


            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "group-delete";

            deleteButton.textContent =
                "×";


            if (
                Number(group.id) === 1
            ) {

                deleteButton.style.display =
                    "none";

            }


            deleteButton.onclick =
                () => {

                    deleteGroup(
                        group.id
                    );

                };


            card.appendChild(
                color
            );

            card.appendChild(
                name
            );

            card.appendChild(
                countElement
            );

            card.appendChild(
                deleteButton
            );


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   グループ追加
===================================================== */

function addGroup() {

    const name =
        prompt(
            "グループ名を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const colors = [

        "#dbeafe",
        "#dcfce7",
        "#fef3c7",
        "#fce7f3",
        "#ede9fe",
        "#cffafe",
        "#ffedd5",
        "#e2e8f0"

    ];


    const newGroup = {

        id:
            Date.now(),

        name:
            name.trim(),

        color:
            colors[
                data.groups.length %
                colors.length
            ]

    };


    data.groups.push(
        newGroup
    );


    saveData();

    renderAll();

}


/* =====================================================
   グループ削除
===================================================== */

function deleteGroup(id) {

    if (
        Number(id) === 1
    ) {

        alert(
            "未所属グループは削除できません"
        );

        return;

    }


    const group =
        data.groups.find(
            g =>
                Number(g.id) ===
                Number(id)
        );


    if (!group) return;


    if (
        !confirm(
            `「${group.name}」を削除しますか？`
        )
    ) return;


    data.members.forEach(
        member => {

            if (
                Number(member.groupId) ===
                Number(id)
            ) {

                member.groupId = 1;

            }

        }
    );


    data.groups =
        data.groups.filter(
            group =>
                Number(group.id) !==
                Number(id)
        );


    if (
        selectedGroupFilter !== "all" &&
        Number(selectedGroupFilter) ===
        Number(id)
    ) {

        selectedGroupFilter =
            "all";

    }


    saveData();

    renderAll();

}


/* =====================================================
   グループフィルター
===================================================== */

let selectedGroupFilter =
    "all";


function renderGroupFilter() {

    const container =
        document.getElementById(
            "groupFilter"
        );


    if (!container) return;


    container.innerHTML = "";


    const allButton =
        document.createElement(
            "button"
        );


    allButton.className =
        "filter-btn " +
        (
            selectedGroupFilter === "all"
                ? "active"
                : ""
        );


    allButton.textContent =
        "全員";


    allButton.onclick = () => {

        selectedGroupFilter =
            "all";

        renderGroupFilter();

        renderMembers();

    };


    container.appendChild(
        allButton
    );


    data.groups.forEach(
        group => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "filter-btn " +
                (
                    Number(selectedGroupFilter) ===
                    Number(group.id)
                        ? "active"
                        : ""
                );


            button.textContent =
                group.name;


            button.onclick = () => {

                selectedGroupFilter =
                    group.id;

                renderGroupFilter();

                renderMembers();

            };


            container.appendChild(
                button
            );

        }
    );

}


/* =====================================================
   メンバー表示
===================================================== */

function renderMembers() {

    const container =
        document.getElementById(
            "memberList"
        );


    if (!container) return;


    container.innerHTML = "";


    const event =
        getCurrentEvent();


    if (!event) return;


    let members =
        [...data.members];


    if (
        selectedGroupFilter !== "all"
    ) {

        members =
            members.filter(
                member =>
                    Number(member.groupId) ===
                    Number(selectedGroupFilter)
            );

    }


    members.forEach(
        member => {

            const status =
                event.members[
                    member.id
                ] || "unpaid";


            const group =
                data.groups.find(
                    group =>
                        Number(group.id) ===
                        Number(member.groupId)
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "member-card";


            if (group) {

                card.classList.add(
                    "group-colored"
                );

                card.style.setProperty(
                    "--group-color",
                    group.color
                );

            }


            if (status === "paid") {

                card.classList.add(
                    "paid"
                );

            }


            if (status === "absent") {

                card.classList.add(
                    "absent"
                );

            }


            card.onclick =
                e => {

                    if (
                        e.target.tagName ===
                        "BUTTON"
                    ) return;

                    togglePayment(
                        member.id
                    );

                };


            if (group) {

                const groupLabel =
                    document.createElement(
                        "div"
                    );

                groupLabel.className =
                    "member-group";

                groupLabel.style.setProperty(
                    "--group-color",
                    group.color
                );

                groupLabel.textContent =
                    group.name;

                card.appendChild(
                    groupLabel
                );

            }


            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "member-name";

            name.textContent =
                member.name;

            card.appendChild(
                name
            );


            const statusText =
                document.createElement(
                    "div"
                );

            statusText.className =
                "member-status";


            if (status === "paid") {

                statusText.textContent =
                    "✓ 支払い済み";

            }
            else if (status === "absent") {

                statusText.textContent =
                    "— 不参加";

            }
            else {

                statusText.textContent =
                    "未払い";

            }


            card.appendChild(
                statusText
            );


            const actions =
                document.createElement(
                    "div"
                );

            actions.className =
                "member-actions";


            const editButton =
                document.createElement(
                    "button"
                );

            editButton.className =
                "group-btn";

            editButton.textContent =
                "名前変更";

            editButton.onclick =
                () =>
                    renameMember(
                        member.id
                    );


            const absentButton =
                document.createElement(
                    "button"
                );

            absentButton.className =
                "absent-btn";

            absentButton.textContent =
                status === "absent"
                    ? "参加に戻す"
                    : "不参加";

            absentButton.onclick =
                () =>
                    toggleAttendance(
                        member.id
                    );


            const groupButton =
                document.createElement(
                    "button"
                );

            groupButton.className =
                "group-btn";

            groupButton.textContent =
                "グループ";

            groupButton.onclick =
                () =>
                    changeMemberGroup(
                        member.id
                    );


            const upButton =
                document.createElement(
                    "button"
                );

            upButton.className =
                "sort-btn";

            upButton.textContent =
                "↑";

            upButton.onclick =
                () =>
                    moveMember(
                        member.id,
                        -1
                    );


            const downButton =
                document.createElement(
                    "button"
                );

            downButton.className =
                "sort-btn";

            downButton.textContent =
                "↓";

            downButton.onclick =
                () =>
                    moveMember(
                        member.id,
                        1
                    );


            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "delete-member";

            deleteButton.textContent =
                "削除";

            deleteButton.onclick =
                () =>
                    deleteMember(
                        member.id
                    );


            actions.appendChild(
                editButton
            );

            actions.appendChild(
                absentButton
            );

            actions.appendChild(
                groupButton
            );

            actions.appendChild(
                upButton
            );

            actions.appendChild(
                downButton
            );

            actions.appendChild(
                deleteButton
            );


            card.appendChild(
                actions
            );


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   名前変更
===================================================== */

function renameMember(memberId) {

    const member =
        data.members.find(
            m =>
                Number(m.id) ===
                Number(memberId)
        );


    if (!member) return;


    const newName =
        prompt(
            "新しい名前を入力してください",
            member.name
        );


    if (
        !newName ||
        !newName.trim()
    ) return;


    member.name =
        newName.trim();


    saveData();

    renderAll();

}


/* =====================================================
   メンバー順番変更
===================================================== */

function moveMember(
    memberId,
    direction
) {

    const index =
        data.members.findIndex(
            member =>
                Number(member.id) ===
                Number(memberId)
        );


    if (index === -1) return;


    const newIndex =
        index + direction;


    if (
        newIndex < 0 ||
        newIndex >= data.members.length
    ) {

        return;

    }


    [
        data.members[index],
        data.members[newIndex]
    ] =
    [
        data.members[newIndex],
        data.members[index]
    ];


    saveData();

    renderMembers();

}


/* =====================================================
   名前順
===================================================== */

function sortMembersByName() {

    if (
        !confirm(
            "メンバーを名前順に並べ替えますか？"
        )
    ) return;


    data.members.sort(
        (a, b) =>
            a.name.localeCompare(
                b.name,
                "ja"
            )
    );


    saveData();

    renderMembers();

}


/* =====================================================
   一括不参加
===================================================== */

function bulkAbsent() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const targetMembers =
        selectedGroupFilter === "all"

            ? [...data.members]

            : data.members.filter(
                member =>
                    Number(member.groupId) ===
                    Number(selectedGroupFilter)
            );


    if (
        targetMembers.length === 0
    ) {

        alert(
            "対象となるメンバーがいません"
        );

        return;

    }


    const targetName =
        selectedGroupFilter === "all"

            ? "全員"

            : (
                data.groups.find(
                    group =>
                        Number(group.id) ===
                        Number(selectedGroupFilter)
                )?.name ||
                "選択グループ"
            );


    if (
        !confirm(
            `${targetName}を一括で不参加にしますか？`
        )
    ) return;


    targetMembers.forEach(
        member => {

            event.members[
                member.id
            ] = "absent";

        }
    );


    saveData();

    renderMembers();

    updateStats();

}


/* =====================================================
   全員参加
===================================================== */

function bulkPresent() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const targetMembers =
        selectedGroupFilter === "all"

            ? [...data.members]

            : data.members.filter(
                member =>
                    Number(member.groupId) ===
                    Number(selectedGroupFilter)
            );


    if (
        targetMembers.length === 0
    ) return;


    if (
        !confirm(
            "対象メンバーを参加に戻しますか？"
        )
    ) return;


    targetMembers.forEach(
        member => {

            event.members[
                member.id
            ] = "unpaid";

        }
    );


    saveData();

    renderMembers();

    updateStats();

}


/* =====================================================
   グループ変更
===================================================== */

function changeMemberGroup(memberId) {

    const member =
        data.members.find(
            m =>
                Number(m.id) ===
                Number(memberId)
        );


    if (!member) return;


    if (
        data.groups.length <= 1
    ) {

        alert(
            "先にグループを追加してください"
        );

        return;

    }


    let message =
        "所属するグループを番号で選択してください\n\n";


    data.groups.forEach(
        (group, index) => {

            message +=
                `${index + 1}. ${group.name}\n`;

        }
    );


    const answer =
        prompt(message);


    if (!answer) return;


    const index =
        Number(answer) - 1;


    if (
        !Number.isInteger(index) ||
        !data.groups[index]
    ) {

        alert(
            "正しい番号を入力してください"
        );

        return;

    }


    member.groupId =
        data.groups[index].id;


    saveData();

    renderAll();

}


/* =====================================================
   支払い
===================================================== */

function togglePayment(memberId) {

    const event =
        getCurrentEvent();


    if (!event) return;


    const current =
        event.members[
            memberId
        ] || "unpaid";


    if (
        current === "absent"
    ) {

        alert(
            "先に「参加に戻す」を押してください"
        );

        return;

    }


    event.members[
        memberId
    ] =
        current === "unpaid"
            ? "paid"
            : "unpaid";


    saveData();

    renderMembers();

    updateStats();

    renderFinance();

}


/* =====================================================
   参加 / 不参加
===================================================== */

function toggleAttendance(memberId) {

    const event =
        getCurrentEvent();


    if (!event) return;


    const current =
        event.members[
            memberId
        ] || "unpaid";


    event.members[
        memberId
    ] =
        current === "absent"
            ? "unpaid"
            : "absent";


    saveData();

    renderMembers();

    updateStats();

    renderFinance();

}


/* =====================================================
   メンバー追加
===================================================== */

function addMember() {

    const name =
        prompt(
            "メンバーの名前を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const newMember = {

        id:
            Date.now(),

        name:
            name.trim(),

        groupId:
            1

    };


    data.members.push(
        newMember
    );


    data.events.forEach(
        event => {

            if (!event.members) {

                event.members = {};

            }

            event.members[
                newMember.id
            ] = "unpaid";

        }
    );


    saveData();

    renderAll();

}


/* =====================================================
   メンバー削除
===================================================== */

function deleteMember(id) {

    const member =
        data.members.find(
            m =>
                Number(m.id) ===
                Number(id)
        );


    if (!member) return;


    if (
        !confirm(
            `${member.name}を削除しますか？`
        )
    ) return;


    data.members =
        data.members.filter(
            m =>
                Number(m.id) !==
                Number(id)
        );


    data.events.forEach(
        event => {

            if (event.members) {

                delete event.members[id];

            }

        }
    );


    saveData();

    renderAll();

}


/* =====================================================
   統計
===================================================== */

function updateStats() {

    const event =
        getCurrentEvent();


    if (!event) return;


    let participants = 0;
    let paid = 0;
    let unpaid = 0;
    let absent = 0;


    data.members.forEach(
        member => {

            const status =
                event.members[
                    member.id
                ] || "unpaid";


            if (status === "absent") {

                absent++;

            }
            else {

                participants++;


                if (status === "paid") {

                    paid++;

                }
                else {

                    unpaid++;

                }

            }

        }
    );


    const collected =
        paid *
        Number(event.fee || 0);


    const remaining =
        unpaid *
        Number(event.fee || 0);


    const participantElement =
        document.getElementById(
            "participantCount"
        );


    const paidElement =
        document.getElementById(
            "paidCount"
        );


    const unpaidElement =
        document.getElementById(
            "unpaidCount"
        );


    const absentElement =
        document.getElementById(
            "absentCount"
        );


    const collectedElement =
        document.getElementById(
            "collectedMoney"
        );


    const remainingElement =
        document.getElementById(
            "remainingMoney"
        );


    if (participantElement)
        participantElement.textContent =
            participants + "人";


    if (paidElement)
        paidElement.textContent =
            paid + "人";


    if (unpaidElement)
        unpaidElement.textContent =
            unpaid + "人";


    if (absentElement)
        absentElement.textContent =
            absent + "人";


    if (collectedElement)
        collectedElement.textContent =
            "¥" +
            collected.toLocaleString();


    if (remainingElement)
        remainingElement.textContent =
            "¥" +
            remaining.toLocaleString();

}


/* =====================================================
   収入追加
===================================================== */

function addIncome() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const name =
        prompt(
            "収入の内容を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const amountInput =
        prompt(
            "金額を入力してください"
        );


    if (amountInput === null) return;


    const amount =
        Number(amountInput);


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "正しい金額を入力してください"
        );

        return;

    }


    event.income.push({

        id:
            Date.now(),

        name:
            name.trim(),

        amount:
            amount,

        date:
            new Date()
                .toLocaleDateString(
                    "ja-JP"
                )

    });


    saveData();

    renderFinance();

}


/* =====================================================
   支出追加
===================================================== */

function addExpense() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const name =
        prompt(
            "支出の内容を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const amountInput =
        prompt(
            "金額を入力してください"
        );


    if (amountInput === null) return;


    const amount =
        Number(amountInput);


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "正しい金額を入力してください"
        );

        return;

    }


    event.expenses.push({

        id:
            Date.now(),

        name:
            name.trim(),

        amount:
            amount,

        date:
            new Date()
                .toLocaleDateString(
                    "ja-JP"
                )

    });


    saveData();

    renderFinance();

}


/* =====================================================
   会計表示
===================================================== */

function renderFinance() {

    const event =
        getCurrentEvent();


    if (!event) return;


    if (!Array.isArray(event.income))
        event.income = [];


    if (!Array.isArray(event.expenses))
        event.expenses = [];


    const participationList =
        document.getElementById(
            "participationIncomeList"
        );


    const incomeList =
        document.getElementById(
            "incomeList"
        );


    const expenseList =
        document.getElementById(
            "expenseList"
        );


    if (participationList)
        participationList.innerHTML = "";


    if (incomeList)
        incomeList.innerHTML = "";


    if (expenseList)
        expenseList.innerHTML = "";


    let paidCount = 0;


    Object.entries(
        event.members || {}
    ).forEach(
        ([memberId, status]) => {

            if (status !== "paid")
                return;


            paidCount++;


            const member =
                data.members.find(
                    m =>
                        String(m.id) ===
                        String(memberId)
                );


            if (
                participationList &&
                member
            ) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "finance-item";


                const left =
                    document.createElement(
                        "div"
                    );


                left.className =
                    "finance-item-left";


                const name =
                    document.createElement(
                        "span"
                    );


                name.className =
                    "finance-item-name";


                name.textContent =
                    member.name;


                const date =
                    document.createElement(
                        "span"
                    );


                date.className =
                    "finance-item-date";


                date.textContent =
                    "参加費";


                left.appendChild(
                    name
                );

                left.appendChild(
                    date
                );


                const right =
                    document.createElement(
                        "div"
                    );


                right.className =
                    "finance-item-right";


                const amount =
                    document.createElement(
                        "span"
                    );


                amount.className =
                    "finance-item-amount income-amount";


                amount.textContent =
                    "+ ¥" +
                    Number(event.fee)
                        .toLocaleString();


                right.appendChild(
                    amount
                );


                item.appendChild(
                    left
                );

                item.appendChild(
                    right
                );


                participationList.appendChild(
                    item
                );

            }

        }
    );


    const participationIncome =
        paidCount *
        (
            Number(event.fee) || 0
        );


    let otherIncome = 0;


    event.income.forEach(
        item => {

            otherIncome +=
                Number(item.amount) || 0;


            if (incomeList) {

                incomeList.appendChild(
                    createFinanceItem(
                        item,
                        "income"
                    )
                );

            }

        }
    );


    let expenseTotal = 0;


    event.expenses.forEach(
        item => {

            expenseTotal +=
                Number(item.amount) || 0;


            if (expenseList) {

                expenseList.appendChild(
                    createFinanceItem(
                        item,
                        "expense"
                    )
                );

            }

        }
    );


    const totalIncome =
        participationIncome +
        otherIncome;


    const balance =
        totalIncome -
        expenseTotal;


    const participationElement =
        document.getElementById(
            "participationIncomeTotal"
        );


    const otherIncomeElement =
        document.getElementById(
            "otherIncomeTotal"
        );


    const expenseElement =
        document.getElementById(
            "expenseTotal"
        );


    const balanceElement =
        document.getElementById(
            "balanceTotal"
        );


    if (participationElement)
        participationElement.textContent =
            "¥" +
            participationIncome.toLocaleString();


    if (otherIncomeElement)
        otherIncomeElement.textContent =
            "¥" +
            otherIncome.toLocaleString();


    if (expenseElement)
        expenseElement.textContent =
            "¥" +
            expenseTotal.toLocaleString();


    if (balanceElement)
        balanceElement.textContent =
            "¥" +
            balance.toLocaleString();


    updateOverallFinance();

}


/* =====================================================
   収支項目
===================================================== */

function createFinanceItem(
    item,
    type
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "finance-item";


    const left =
        document.createElement(
            "div"
        );


    left.className =
        "finance-item-left";


    const name =
        document.createElement(
            "span"
        );


    name.className =
        "finance-item-name";


    name.textContent =
        item.name;


    const date =
        document.createElement(
            "span"
        );


    date.className =
        "finance-item-date";


    date.textContent =
        item.date;


    left.appendChild(
        name
    );

    left.appendChild(
        date
    );


    const right =
        document.createElement(
            "div"
        );


    right.className =
        "finance-item-right";


    const amount =
        document.createElement(
            "span"
        );


    amount.className =
        "finance-item-amount " +
        (
            type === "income"
                ? "income-amount"
                : "expense-amount"
        );


    amount.textContent =
        (
            type === "income"
                ? "+ ¥"
                : "- ¥"
        ) +
        Number(item.amount)
            .toLocaleString();


    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.className =
        "delete-finance";


    deleteButton.textContent =
        "×";


    deleteButton.onclick =
        () => {

            deleteFinanceItem(
                type,
                item.id
            );

        };


    right.appendChild(
        amount
    );

    right.appendChild(
        deleteButton
    );


    element.appendChild(
        left
    );

    element.appendChild(
        right
    );


    return element;

}


/* =====================================================
   収支削除
===================================================== */

function deleteFinanceItem(
    type,
    id
) {

    const event =
        getCurrentEvent();


    if (!event) return;


    if (type === "income") {

        event.income =
            event.income.filter(
                item =>
                    Number(item.id) !==
                    Number(id)
            );

    }
    else {

        event.expenses =
            event.expenses.filter(
                item =>
                    Number(item.id) !==
                    Number(id)
            );

    }


    saveData();

    renderFinance();

}


/* =====================================================
   計算機
===================================================== */

function calculateCustom() {

    const peopleElement =
        document.getElementById(
            "calcPeople"
        );


    const totalElement =
        document.getElementById(
            "calcTotal"
        );


    const resultElement =
        document.getElementById(
            "calcPerPerson"
        );


    if (
        !peopleElement ||
        !totalElement ||
        !resultElement
    ) return;


    const people =
        Number(
            peopleElement.value
        );


    const total =
        Number(
            totalElement.value
        );


    let result = 0;


    if (
        people > 0 &&
        Number.isFinite(total)
    ) {

        result =
            Math.ceil(
                total / people
            );

    }


    resultElement.textContent =
        "¥" +
        result.toLocaleString();

}


/* =====================================================
   現在の会計リセット
===================================================== */

function resetCurrentEvent() {

    const event =
        getCurrentEvent();


    if (!event) return;


    if (
        !confirm(
            `「${event.name}」の支払い状況を全て未払いに戻しますか？`
        )
    ) return;


    event.members = {};


    saveData();

    renderMembers();

    updateStats();

    renderFinance();

}


/* =====================================================
   全データ削除
===================================================== */

async function resetAllData() {

    if (
        !confirm(
            "全てのデータを削除します。\n本当に削除しますか？"
        )
    ) return;


    data =
        structuredClone(
            DEFAULT_DATA
        );


    normalizeData(data);


    saveLocalOnly();


    if (
        firebaseReady &&
        cloudDataRef
    ) {

        try {

            await setDoc(

                cloudDataRef,

                {
                    data:
                        structuredClone(
                            DEFAULT_DATA
                        ),

                    updatedAt:
                        new Date().toISOString()

                }

            );


            console.log(
                "☁️ Firebaseデータをリセットしました"
            );

        }
        catch (error) {

            console.error(
                "Firebaseリセットエラー:",
                error
            );

        }

    }


    location.reload();

}


/* =====================================================
   バックアップ
===================================================== */

function exportData() {

    const json =
        JSON.stringify(
            data,
            null,
            2
        );


    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement(
            "a"
        );


    a.href =
        url;


    a.download =
        "CircleAccounting_backup.json";


    document.body.appendChild(
        a
    );


    a.click();


    a.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        100
    );

}


/* =====================================================
   復元
===================================================== */

function importData(event) {

    const file =
        event?.target?.files?.[0];


    if (!file) return;


    const reader =
        new FileReader();


    reader.onload =
        async e => {

            try {

                const imported =
                    JSON.parse(
                        e.target.result
                    );


                if (
                    !imported ||
                    !Array.isArray(
                        imported.events
                    ) ||
                    !Array.isArray(
                        imported.members
                    )
                ) {

                    throw new Error(
                        "Invalid backup"
                    );

                }


                if (
                    !confirm(
                        "現在のデータをバックアップデータに置き換えますか？"
                    )
                ) {

                    return;

                }


                data =
                    imported;


                normalizeData(
                    data
                );


                saveLocalOnly();


                await saveToCloud();


                alert(
                    "データを復元しました！"
                );


                location.reload();

            }
            catch (error) {

                console.error(
                    "バックアップ復元エラー:",
                    error
                );


                alert(
                    "バックアップファイルを読み込めませんでした。"
                );

            }

        };


    reader.onerror =
        () => {

            alert(
                "ファイルの読み込みに失敗しました。"
            );

        };


    reader.readAsText(file);

}


/* =====================================================
   参加費変更
===================================================== */

function changeFee() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const input =
        prompt(
            "新しい参加費を入力してください",
            event.fee
        );


    if (
        input === null
    ) return;


    const newFee =
        Number(input);


    if (
        !Number.isFinite(newFee) ||
        newFee < 0
    ) {

        alert(
            "正しい金額を入力してください"
        );

        return;

    }


    if (
        !confirm(
            `参加費を ¥${Number(event.fee).toLocaleString()} から ¥${newFee.toLocaleString()} に変更しますか？`
        )
    ) {

        return;

    }


    event.fee =
        newFee;


    saveData();

    renderAll();

}


/* =====================================================
   サークル全体の会計
===================================================== */

function updateOverallFinance() {

    let totalParticipationIncome = 0;

    let totalOtherIncome = 0;

    let totalExpense = 0;


    data.events.forEach(
        event => {

            let paidCount = 0;


            Object.values(
                event.members || {}
            ).forEach(
                status => {

                    if (
                        status === "paid"
                    ) {

                        paidCount++;

                    }

                }
            );


            totalParticipationIncome +=

                paidCount *
                (
                    Number(event.fee) || 0
                );


            (
                event.income || []
            ).forEach(
                item => {

                    totalOtherIncome +=
                        Number(
                            item.amount
                        ) || 0;

                }
            );


            (
                event.expenses || []
            ).forEach(
                item => {

                    totalExpense +=
                        Number(
                            item.amount
                        ) || 0;

                }
            );

        }
    );


    const totalIncome =
        totalParticipationIncome +
        totalOtherIncome;


    const balance =
        totalIncome -
        totalExpense;


    const incomeElement =
        document.getElementById(
            "overallIncome"
        );


    const expenseElement =
        document.getElementById(
            "overallExpense"
        );


    const balanceElement =
        document.getElementById(
            "overallBalance"
        );


    if (incomeElement) {

        incomeElement.textContent =
            "¥" +
            totalIncome.toLocaleString();

    }


    if (expenseElement) {

        expenseElement.textContent =
            "¥" +
            totalExpense.toLocaleString();

    }


    if (balanceElement) {

        balanceElement.textContent =
            "¥" +
            balance.toLocaleString();

    }

}


/* =====================================================
   HTML onclick対応
===================================================== */

/*
    type="module" の場合、
    function はグローバルスコープに公開されません。

    HTML側で onclick="addEvent()" などを使っているため、
    window に明示的に登録します。
*/

window.addEvent =
    addEvent;

window.deleteEvent =
    deleteEvent;

window.addGroup =
    addGroup;

window.deleteGroup =
    deleteGroup;

window.addMember =
    addMember;

window.deleteMember =
    deleteMember;

window.renameMember =
    renameMember;

window.moveMember =
    moveMember;

window.sortMembersByName =
    sortMembersByName;

window.bulkAbsent =
    bulkAbsent;

window.bulkPresent =
    bulkPresent;

window.changeMemberGroup =
    changeMemberGroup;

window.togglePayment =
    togglePayment;

window.toggleAttendance =
    toggleAttendance;

window.addIncome =
    addIncome;

window.addExpense =
    addExpense;

window.deleteFinanceItem =
    deleteFinanceItem;

window.calculateCustom =
    calculateCustom;

window.resetCurrentEvent =
    resetCurrentEvent;

window.resetAllData =
    resetAllData;

window.exportData =
    exportData;

window.importData =
    importData;

window.changeFee =
    changeFee;


/* =====================================================
   デバッグ用
===================================================== */

window.circleAccounting =
    {

        getData:
            () =>
                structuredClone(data),

        save:
            saveData,

        saveCloud:
            saveToCloud,

        loadCloud:
            loadFromCloud,

        render:
            renderAll

    };


console.log(
    "🚀 Circle Accounting Firebase版 起動"
);

console.log(
    "🔥 Firebase:",
    firebaseReady
);

console.log(
    "📦 LocalStorage:",
    !!localStorage
);