```javascript
/* =====================================================
   Circle Accounting
   Firebase Firestore + LocalStorage
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

    apiKey:
        "AIzaSyAvDWjqiv4G-fMW3_ovTtDLXT-514Q5TX8",

    authDomain:
        "circle-accounting-b2194.firebaseapp.com",

    projectId:
        "circle-accounting-b2194",

    storageBucket:
        "circle-accounting-b2194.firebasestorage.app",

    messagingSenderId:
        "122808479714",

    appId:
        "1:122808479714:web:b4f74aa3412064bee653bb"

};


const firebaseApp =
    initializeApp(firebaseConfig);


const db =
    getFirestore(firebaseApp);


/*
    Firestoreに保存する場所

    circleAccounting
        └── main
              └── data
*/

const cloudDataRef =
    doc(
        db,
        "circleAccounting",
        "main"
    );


/* =====================================================
   Firebase状態
===================================================== */

let firebaseReady = true;

let cloudLoading = false;


/* =====================================================
   初期データ
===================================================== */

const DEFAULT_GROUPS = [

    {
        id: 1,
        name: "未所属",
        color: "#dbeafe"
    }

];


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
        DEFAULT_GROUPS,


    currentEventId:
        1

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

    if (!target.groups) {

        target.groups =
            structuredClone(
                DEFAULT_GROUPS
            );

    }


    if (!target.members) {

        target.members = [];

    }


    if (!target.events) {

        target.events = [];

    }


    target.members.forEach(

        member => {

            if (!member.groupId) {

                member.groupId = 1;

            }

        }

    );


    target.events.forEach(

        event => {

            if (!event.members) {

                event.members = {};

            }


            if (!event.income) {

                event.income = [];

            }


            if (!event.expenses) {

                event.expenses = [];

            }

        }

    );


    if (
        target.events.length > 0 &&
        !target.events.some(
            event =>
                event.id ===
                target.currentEventId
        )
    ) {

        target.currentEventId =
            target.events[0].id;

    }

}


/* =====================================================
   現在のデータ
===================================================== */

let data =
    loadLocalData();


/* =====================================================
   クラウド保存
===================================================== */

async function saveToCloud() {

    try {

        await setDoc(

            cloudDataRef,

            {
                data: data,
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


        firebaseReady = false;


        showCloudStatus(
            "⚠️ クラウド保存失敗"
        );


        return false;

    }

}


/* =====================================================
   クラウド読み込み
===================================================== */

async function loadFromCloud() {

    cloudLoading = true;


    try {

        const snapshot =
            await getDoc(
                cloudDataRef
            );


        if (snapshot.exists()) {

            const cloud =
                snapshot.data();


            if (cloud.data) {

                data =
                    cloud.data;


                normalizeData(
                    data
                );


                localStorage.setItem(

                    "circleAccounting",

                    JSON.stringify(data)

                );


                console.log(
                    "☁️ Firestoreから読み込み成功"
                );


                showCloudStatus(
                    "☁️ クラウドデータを読み込みました"
                );

            }

        }

        else {

            /*
                初回だけ
                現在のローカルデータを
                クラウドへ保存
            */

            await saveToCloud();

        }

    }

    catch (error) {

        console.error(
            "Firestore読み込みエラー:",
            error
        );


        firebaseReady = false;


        showCloudStatus(
            "📱 オフラインモード"
        );

    }


    cloudLoading = false;

}


/* =====================================================
   保存
===================================================== */

function saveData() {

    /*
        まずローカル保存
    */

    localStorage.setItem(

        "circleAccounting",

        JSON.stringify(data)

    );


    /*
        クラウド保存
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
            "9999";

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


        document.body.appendChild(
            status
        );

    }


    status.textContent =
        message;


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
   現在の会計
===================================================== */

function getCurrentEvent() {

    return data.events.find(

        event =>
            event.id ===
            data.currentEventId

    );

}


/* =====================================================
   初期化
===================================================== */

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        renderEvents();

        renderGroups();

        renderGroupFilter();

        renderMembers();

        renderFinance();

        updateStats();

        updateOverallFinance();

        calculateCustom();


        /*
            Firebaseから最新データを取得
        */

        await loadFromCloud();


        /*
            クラウド読み込み後に
            画面を再描画
        */

        renderEvents();

        renderGroups();

        renderGroupFilter();

        renderMembers();

        renderFinance();

        updateStats();

        updateOverallFinance();

        calculateCustom();

    }

);


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
                    event.id ===
                    data.currentEventId

                        ? "active"

                        : ""

                );


            card.onclick = () => {

                data.currentEventId =
                    event.id;


                saveData();


                renderEvents();

                renderMembers();

                renderFinance();

                updateStats();

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


            card.appendChild(name);

            card.appendChild(fee);

            card.appendChild(
                deleteButton
            );


            container.appendChild(card);

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
                )
                .toLocaleString();

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


    const fee =
        Number(feeInput);


    if (
        isNaN(fee) ||
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


    renderEvents();

    renderMembers();

    renderFinance();

    updateStats();

}


/* =====================================================
   会計削除
===================================================== */

function deleteEvent(id) {

    if (
        data.events.length === 1
    ) {

        alert(
            "会計は最低1つ必要です"
        );

        return;

    }


    const event =
        data.events.find(
            e => e.id === id
        );


    if (!event) return;


    if (
        !confirm(
            `「${event.name}」を削除しますか？`
        )
    ) return;


    data.events =
        data.events.filter(
            e => e.id !== id
        );


    if (
        data.currentEventId === id
    ) {

        data.currentEventId =
            data.events[0].id;

    }


    saveData();


    renderEvents();

    renderMembers();

    renderFinance();

    updateStats();

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
                        member.groupId ===
                        group.id

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
                group.id === 1
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


            card.appendChild(color);

            card.appendChild(name);

            card.appendChild(
                countElement
            );

            card.appendChild(
                deleteButton
            );


            container.appendChild(card);

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


    const colorIndex =
        data.groups.length %
        colors.length;


    const newGroup = {

        id:
            Date.now(),

        name:
            name.trim(),

        color:
            colors[colorIndex]

    };


    data.groups.push(
        newGroup
    );


    saveData();


    renderGroups();

    renderGroupFilter();

    renderMembers();

}


/* =====================================================
   グループ削除
===================================================== */

function deleteGroup(id) {

    if (id === 1) {

        alert(
            "未所属グループは削除できません"
        );

        return;

    }


    const group =
        data.groups.find(
            g => g.id === id
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
                member.groupId === id
            ) {

                member.groupId = 1;

            }

        }

    );


    data.groups =
        data.groups.filter(

            group =>
                group.id !== id

        );


    saveData();


    renderGroups();

    renderGroupFilter();

    renderMembers();

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
            selectedGroupFilter ===
            "all"

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
                    selectedGroupFilter ===
                    group.id

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
        selectedGroupFilter !==
        "all"
    ) {

        members =
            members.filter(

                member =>
                    member.groupId ===
                    selectedGroupFilter

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
                        group.id ===
                        member.groupId

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


            if (
                status === "paid"
            ) {

                card.classList.add(
                    "paid"
                );

            }


            if (
                status === "absent"
            ) {

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


            card.appendChild(name);


            const statusText =
                document.createElement(
                    "div"
                );


            statusText.className =
                "member-status";


            if (
                status === "paid"
            ) {

                statusText.textContent =
                    "✓ 支払い済み";

            }

            else if (
                status === "absent"
            ) {

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
                () => {

                    renameMember(
                        member.id
                    );

                };


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
                () => {

                    toggleAttendance(
                        member.id
                    );

                };


            const groupButton =
                document.createElement(
                    "button"
                );


            groupButton.className =
                "group-btn";


            groupButton.textContent =
                "グループ";


            groupButton.onclick =
                () => {

                    changeMemberGroup(
                        member.id
                    );

                };


            const upButton =
                document.createElement(
                    "button"
                );


            upButton.className =
                "sort-btn";


            upButton.textContent =
                "↑";


            upButton.title =
                "上へ";


            upButton.onclick =
                () => {

                    moveMember(
                        member.id,
                        -1
                    );

                };


            const downButton =
                document.createElement(
                    "button"
                );


            downButton.className =
                "sort-btn";


            downButton.textContent =
                "↓";


            downButton.title =
                "下へ";


            downButton.onclick =
                () => {

                    moveMember(
                        member.id,
                        1
                    );

                };


            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.className =
                "delete-member";


            deleteButton.textContent =
                "削除";


            deleteButton.onclick =
                () => {

                    deleteMember(
                        member.id
                    );

                };


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


            card.appendChild(actions);


            container.appendChild(card);

        }

    );

}


/* =====================================================
   名前変更
===================================================== */

function renameMember(memberId) {

    const member =
        data.members.find(
            m => m.id === memberId
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


    renderGroups();

    renderMembers();

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
                member.id ===
                memberId

        );


    if (index === -1) return;


    const newIndex =
        index + direction;


    if (
        newIndex < 0 ||
        newIndex >=
        data.members.length
    ) {

        return;

    }


    const temp =
        data.members[index];


    data.members[index] =
        data.members[newIndex];


    data.members[newIndex] =
        temp;


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


    let targetMembers;


    if (
        selectedGroupFilter !==
        "all"
    ) {

        targetMembers =
            data.members.filter(

                member =>
                    member.groupId ===
                    selectedGroupFilter

            );

    }

    else {

        targetMembers =
            [...data.members];

    }


    if (
        targetMembers.length === 0
    ) {

        alert(
            "対象となるメンバーがいません"
        );

        return;

    }


    const targetName =

        selectedGroupFilter ===
        "all"

            ? "全員"

            : (

                data.groups.find(

                    group =>
                        group.id ===
                        selectedGroupFilter

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


    let targetMembers;


    if (
        selectedGroupFilter !==
        "all"
    ) {

        targetMembers =
            data.members.filter(

                member =>
                    member.groupId ===
                    selectedGroupFilter

            );

    }

    else {

        targetMembers =
            [...data.members];

    }


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
                m.id ===
                memberId
        );


    if (!member) return;


    if (
        data.groups.length === 1
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
        isNaN(index) ||
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


    renderGroups();

    renderMembers();

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

            event.members[
                newMember.id
            ] = "unpaid";

        }

    );


    saveData();


    renderGroups();

    renderMembers();

    updateStats();

}


/* =====================================================
   メンバー削除
===================================================== */

function deleteMember(id) {

    const member =
        data.members.find(
            m => m.id === id
        );


    if (!member) return;


    if (
        !confirm(
            `${member.name}を削除しますか？`
        )
    ) return;


    data.members =
        data.members.filter(
            m => m.id !== id
        );


    data.events.forEach(

        event => {

            delete event.members[id];

        }

    );


    saveData();


    renderGroups();

    renderMembers();

    updateStats();

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


            if (
                status === "absent"
            ) {

                absent++;

            }

            else {

                participants++;


                if (
                    status === "paid"
                ) {

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
   収入
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


    const amount =
        Number(
            prompt(
                "金額を入力してください"
            )
        );


    if (
        isNaN(amount) ||
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
   支出
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


    const amount =
        Number(
            prompt(
                "金額を入力してください"
            )
        );


    if (
        isNaN(amount) ||
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
   会計帳簿
===================================================== */

function renderFinance() {

    const event =
        getCurrentEvent();


    if (!event) return;


    if (!event.income)
        event.income = [];


    if (!event.expenses)
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

            if (
                status !== "paid"
            ) return;


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


                item.innerHTML = `

                    <div class="finance-item-left">

                        <span class="finance-item-name">
                            ${escapeHTML(member.name)}
                        </span>

                        <span class="finance-item-date">
                            参加費
                        </span>

                    </div>

                    <div class="finance-item-right">

                        <span class="finance-item-amount income-amount">
                            + ¥${Number(event.fee).toLocaleString()}
                        </span>

                    </div>

                `;


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
   HTMLエスケープ
===================================================== */

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

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


    left.appendChild(name);

    left.appendChild(date);


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


    right.appendChild(amount);

    right.appendChild(
        deleteButton
    );


    element.appendChild(left);

    element.appendChild(right);


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


    if (
        type === "income"
    ) {

        event.income =
            event.income.filter(

                item =>
                    item.id !== id

            );

    }

    else {

        event.expenses =
            event.expenses.filter(

                item =>
                    item.id !== id

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
        people > 0
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


    localStorage.removeItem(
        "circleAccounting"
    );


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

    }

    catch (error) {

        console.error(error);

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


    a.href = url;


    a.download =
        "CircleAccounting_backup.json";


    a.click();


    URL.revokeObjectURL(
        url
    );

}


/* =====================================================
   復元
===================================================== */

function importData(event) {

    const file =
        event.target.files[0];


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
                    !imported.events ||
                    !imported.members
                ) {

                    throw new Error();

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


                localStorage.setItem(

                    "circleAccounting",

                    JSON.stringify(data)

                );


                await saveToCloud();


                alert(
                    "データを復元しました！"
                );


                location.reload();

            }

            catch(error) {

                console.error(error);


                alert(
                    "バックアップファイルを読み込めませんでした。"
                );

            }

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


    const newFee =
        Number(

            prompt(

                "新しい参加費を入力してください",

                event.fee

            )

        );


    if (
        isNaN(newFee) ||
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


    renderEvents();

    renderMembers();

    renderFinance();

    updateStats();

}


/* =====================================================
   サークル全体の会計
===================================================== */

function updateOverallFinance() {

    let totalParticipationIncome =
        0;


    let totalOtherIncome =
        0;


    let totalExpense =
        0;


    data.events.forEach(

        event => {

            let paidCount =
                0;


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
   HTMLのonclickから呼び出せるようにする
===================================================== */

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


console.log(
    "☁️ Circle Accounting Firebase版 起動"
);
```
