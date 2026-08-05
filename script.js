/* =====================================================
   Circle Accounting
   Firebase Authentication + Firestore
   Complete Version
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

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


/* =====================================================
   Firebase Configuration
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


/* =====================================================
   Firebase Initialization
===================================================== */

let firebaseApp = null;

let db = null;

let auth = null;

let firebaseReady = false;

let currentUser = null;


try {

    firebaseApp =
        initializeApp(
            firebaseConfig
        );

    db =
        getFirestore(
            firebaseApp
        );

    auth =
        getAuth(
            firebaseApp
        );

    firebaseReady = true;

    console.log(
        "🔥 Firebase initialization successful"
    );

}
catch (error) {

    console.error(
        "Firebase initialization error:",
        error
    );

    firebaseReady = false;

}


/* =====================================================
   Default Groups
===================================================== */

const DEFAULT_GROUPS = [

    {
        id: 1,
        name: "未所属",
        color: "#dbeafe"
    }

];


/* =====================================================
   Default Data
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
        structuredClone(
            DEFAULT_GROUPS
        ),

    currentEventId: 1

};


/* =====================================================
   Application Data
===================================================== */

let data =
    structuredClone(
        DEFAULT_DATA
    );


/* =====================================================
   State
===================================================== */

let selectedGroupFilter =
    "all";

let cloudLoading = false;

let cloudSaving = false;

let authInitialized = false;


/* =====================================================
   DOM Helper
===================================================== */

function $(id) {

    return document.getElementById(id);

}


/* =====================================================
   LocalStorage Key
===================================================== */

function getLocalStorageKey() {

    if (currentUser) {

        return (
            "circleAccounting_" +
            currentUser.uid
        );

    }

    return "circleAccounting_guest";

}


/* =====================================================
   Normalize Data
===================================================== */

function normalizeData(target) {

    if (
        !target ||
        typeof target !== "object"
    ) {

        return;

    }


    if (
        !Array.isArray(
            target.events
        )
    ) {

        target.events = [];

    }


    if (
        !Array.isArray(
            target.members
        )
    ) {

        target.members = [];

    }


    if (
        !Array.isArray(
            target.groups
        )
    ) {

        target.groups =
            structuredClone(
                DEFAULT_GROUPS
            );

    }


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


    target.members.forEach(
        member => {

            if (
                member.groupId === undefined ||
                member.groupId === null
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


            if (
                !Array.isArray(
                    event.income
                )
            ) {

                event.income = [];

            }


            if (
                !Array.isArray(
                    event.expenses
                )
            ) {

                event.expenses = [];

            }


            event.fee =
                Number(event.fee) || 0;

        }
    );


    if (
        target.events.length === 0
    ) {

        target.events.push(
            structuredClone(
                DEFAULT_DATA.events[0]
            )
        );

    }


    const currentExists =
        target.events.some(
            event =>
                event.id ===
                target.currentEventId
        );


    if (!currentExists) {

        target.currentEventId =
            target.events[0].id;

    }

}


/* =====================================================
   LocalStorage Load
===================================================== */

function loadLocalData() {

    try {

        const key =
            getLocalStorageKey();

        const saved =
            localStorage.getItem(
                key
            );


        if (!saved) {

            return structuredClone(
                DEFAULT_DATA
            );

        }


        const parsed =
            JSON.parse(
                saved
            );


        normalizeData(
            parsed
        );


        return parsed;

    }
    catch (error) {

        console.error(
            "Local data load error:",
            error
        );

        return structuredClone(
            DEFAULT_DATA
        );

    }

}


/* =====================================================
   LocalStorage Save
===================================================== */

function saveLocalOnly() {

    try {

        localStorage.setItem(

            getLocalStorageKey(),

            JSON.stringify(
                data
            )

        );

    }
    catch (error) {

        console.error(
            "LocalStorage save error:",
            error
        );

    }

}


/* =====================================================
   Firestore Reference
===================================================== */

function getCloudDataRef() {

    if (
        !firebaseReady ||
        !db ||
        !currentUser
    ) {

        return null;

    }


    return doc(

        db,

        "users",

        currentUser.uid,

        "accounting",

        "data"

    );

}


/* =====================================================
   Cloud Status
===================================================== */

function showCloudStatus(message) {

    let element =
        $("cloudStatus");


    if (!element) {

        element =
            document.createElement(
                "div"
            );

        element.id =
            "cloudStatus";

        document.body.appendChild(
            element
        );

    }


    element.textContent =
        message;

    element.style.opacity =
        "1";


    clearTimeout(
        element._timer
    );


    element._timer =
        setTimeout(
            () => {

                element.style.opacity =
                    "0.75";

            },
            3000
        );

}


/* =====================================================
   Authentication Message
===================================================== */

function showAuthMessage(
    message,
    success = false
) {

    const element =
        $("authMessage");


    if (!element) return;


    element.textContent =
        message;


    element.classList.toggle(
        "success",
        success
    );

}


/* =====================================================
   Auth Loading
===================================================== */

function setAuthLoading(
    loading
) {

    const loadingElement =
        $("authLoading");

    const mainButton =
        $("authMainButton");

    const modeButton =
        $("authModeButton");

    const resetButton =
        $("resetPasswordButton");


    if (loadingElement) {

        loadingElement.style.display =
            loading
                ? "block"
                : "none";

    }


    if (mainButton) {

        mainButton.disabled =
            loading;

    }


    if (modeButton) {

        modeButton.disabled =
            loading;

    }


    if (resetButton) {

        resetButton.disabled =
            loading;

    }

}


/* =====================================================
   Auth Mode
===================================================== */

let authMode =
    "login";


function updateAuthMode() {

    const title =
        $("authMainButton");

    const modeButton =
        $("authModeButton");


    if (!title || !modeButton) {

        return;

    }


    if (
        authMode === "login"
    ) {

        title.textContent =
            "ログイン";

        modeButton.textContent =
            "新規アカウントを作成";

    }
    else {

        title.textContent =
            "アカウントを作成";

        modeButton.textContent =
            "ログイン画面に戻る";

    }


    showAuthMessage("");

}


/* =====================================================
   Firebase Auth Error
===================================================== */

function getAuthErrorMessage(
    error
) {

    const code =
        error?.code || "";


    switch (code) {

        case "auth/invalid-email":

            return "メールアドレスの形式が正しくありません。";


        case "auth/user-not-found":

            return "このアカウントは存在しません。";


        case "auth/wrong-password":

            return "パスワードが間違っています。";


        case "auth/invalid-credential":

            return "メールアドレスまたはパスワードが間違っています。";


        case "auth/email-already-in-use":

            return "このメールアドレスはすでに登録されています。";


        case "auth/weak-password":

            return "パスワードは6文字以上にしてください。";


        case "auth/too-many-requests":

            return "試行回数が多すぎます。しばらく待ってください。";


        case "auth/network-request-failed":

            return "ネットワーク接続を確認してください。";


        case "auth/operation-not-allowed":

            return "Firebaseでメール・パスワード認証が有効になっていません。";


        case "auth/user-disabled":

            return "このアカウントは無効になっています。";


        default:

            console.error(
                "Unknown Firebase Auth error:",
                error
            );

            return (
                "認証エラーが発生しました。"
            );

    }

}


/* =====================================================
   Login / Register
===================================================== */

async function handleAuth() {

    if (!auth) {

        showAuthMessage(
            "Firebaseに接続できません。"
        );

        return;

    }


    const email =
        $("authEmail")?.value
            .trim();


    const password =
        $("authPassword")?.value || "";


    if (!email || !password) {

        showAuthMessage(
            "メールアドレスとパスワードを入力してください。"
        );

        return;

    }


    if (
        authMode === "register" &&
        password.length < 6
    ) {

        showAuthMessage(
            "パスワードは6文字以上にしてください。"
        );

        return;

    }


    setAuthLoading(true);

    showAuthMessage("");


    try {

        if (
            authMode === "login"
        ) {

            await signInWithEmailAndPassword(

                auth,

                email,

                password

            );

        }
        else {

            await createUserWithEmailAndPassword(

                auth,

                email,

                password

            );

        }


        $("authPassword").value =
            "";


    }
    catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        showAuthMessage(
            getAuthErrorMessage(
                error
            )
        );

    }
    finally {

        setAuthLoading(false);

    }

}


/* =====================================================
   Password Reset
===================================================== */

async function resetPassword() {

    if (!auth) {

        showAuthMessage(
            "Firebaseに接続できません。"
        );

        return;

    }


    const email =
        $("authEmail")?.value
            .trim();


    if (!email) {

        showAuthMessage(
            "パスワードをリセットするメールアドレスを入力してください。"
        );

        return;

    }


    if (
        !confirm(
            `${email} にパスワード再設定メールを送信しますか？`
        )
    ) {

        return;

    }


    setAuthLoading(true);

    showAuthMessage("");


    try {

        await sendPasswordResetEmail(

            auth,

            email

        );


        showAuthMessage(

            "パスワード再設定メールを送信しました。メールを確認してください。",

            true

        );

    }
    catch (error) {

        console.error(
            "Password reset error:",
            error
        );

        showAuthMessage(
            getAuthErrorMessage(
                error
            )
        );

    }
    finally {

        setAuthLoading(false);

    }

}


/* =====================================================
   Show App
===================================================== */

function showApp() {

    const authScreen =
        $("authScreen");

    const app =
        $("app");


    if (authScreen) {

        authScreen.style.display =
            "none";

    }


    if (app) {

        app.classList.remove(
            "app-hidden"
        );

        app.style.display =
            "block";

    }

}


/* =====================================================
   Show Login
===================================================== */

function showLogin() {

    const authScreen =
        $("authScreen");

    const app =
        $("app");


    if (app) {

        app.style.display =
            "none";

    }


    if (authScreen) {

        authScreen.style.display =
            "flex";

    }


    const email =
        $("authEmail");

    const password =
        $("authPassword");


    if (email) {

        email.value = "";

    }


    if (password) {

        password.value = "";

    }


    showAuthMessage("");

    setAuthLoading(false);

}


/* =====================================================
   Logout
===================================================== */

async function logout() {

    if (!auth) return;


    const confirmed =
        confirm(
            "ログアウトしますか？"
        );


    if (!confirmed) {

        return;

    }


    try {

        await signOut(
            auth
        );

    }
    catch (error) {

        console.error(
            "Logout error:",
            error
        );

        alert(
            "ログアウトに失敗しました。"
        );

    }

}


/* =====================================================
   Firestore Save
===================================================== */

async function saveToCloud() {

    const ref =
        getCloudDataRef();


    if (!ref) {

        return false;

    }


    if (cloudSaving) {

        return false;

    }


    cloudSaving = true;


    try {

        await setDoc(

            ref,

            {

                data:
                    structuredClone(
                        data
                    ),

                updatedAt:
                    new Date()
                        .toISOString()

            }

        );


        showCloudStatus(
            "☁️ クラウド保存済み"
        );


        return true;

    }
    catch (error) {

        console.error(
            "Firestore save error:",
            error
        );

        showCloudStatus(
            "📱 ローカル保存済み"
        );

        return false;

    }
    finally {

        cloudSaving = false;

    }

}


/* =====================================================
   Firestore Load
===================================================== */

async function loadFromCloud() {

    const ref =
        getCloudDataRef();


    if (!ref) {

        return false;

    }


    cloudLoading = true;


    try {

        const snapshot =
            await getDoc(
                ref
            );


        if (
            snapshot.exists()
        ) {

            const cloudData =
                snapshot.data();


            if (
                cloudData.data
            ) {

                data =
                    cloudData.data;

                normalizeData(
                    data
                );

                saveLocalOnly();

                showCloudStatus(
                    "☁️ クラウドデータを読み込みました"
                );

                return true;

            }

        }


        /*
            初回ログイン
        */

        normalizeData(
            data
        );

        await saveToCloud();


        return true;

    }
    catch (error) {

        console.error(
            "Firestore load error:",
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
   Save Data
===================================================== */

function saveData() {

    normalizeData(
        data
    );

    saveLocalOnly();


    if (
        currentUser &&
        firebaseReady &&
        !cloudLoading
    ) {

        saveToCloud();

    }


    updateOverallFinance();

}


/* =====================================================
   Current Event
===================================================== */

function getCurrentEvent() {

    return data.events.find(

        event =>
            event.id ===
            data.currentEventId

    );

}


/* =====================================================
   Render All
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
   Render Events
===================================================== */

function renderEvents() {

    const container =
        $("eventList");


    if (!container) return;


    container.innerHTML = "";


    data.events.forEach(
        event => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "event-card";


            if (
                event.id ===
                data.currentEventId
            ) {

                card.classList.add(
                    "active"
                );

            }


            card.addEventListener(
                "click",
                () => {

                    data.currentEventId =
                        event.id;

                    saveData();

                    renderAll();

                }
            );


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
                Number(
                    event.fee
                ).toLocaleString();


            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "delete-event";

            deleteButton.type =
                "button";

            deleteButton.textContent =
                "×";


            deleteButton.addEventListener(
                "click",
                eventObject => {

                    eventObject.stopPropagation();

                    deleteEvent(
                        event.id
                    );

                }
            );


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


    const nameElement =
        $("currentEventName");

    const feeElement =
        $("currentFee");


    if (
        currentEvent
    ) {

        if (nameElement) {

            nameElement.textContent =
                currentEvent.name;

        }


        if (feeElement) {

            feeElement.textContent =
                "¥" +
                Number(
                    currentEvent.fee
                ).toLocaleString();

        }

    }
    else {

        if (nameElement) {

            nameElement.textContent =
                "会計を選択してください";

        }


        if (feeElement) {

            feeElement.textContent =
                "¥0";

        }

    }

}


/* =====================================================
   Add Event
===================================================== */

function addEvent() {

    const name =
        prompt(
            "会計の目的を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) {

        return;

    }


    const feeInput =
        prompt(
            "1人あたりの金額を入力してください",
            "3000"
        );


    if (
        feeInput === null
    ) {

        return;

    }


    const fee =
        Number(
            feeInput
        );


    if (
        !Number.isFinite(fee) ||
        fee < 0
    ) {

        alert(
            "金額を正しく入力してください。"
        );

        return;

    }


    const newEvent = {

        id:
            Date.now(),

        name:
            name.trim(),

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
   Delete Event
===================================================== */

function deleteEvent(id) {

    if (
        data.events.length <= 1
    ) {

        alert(
            "会計は最低1つ必要です。"
        );

        return;

    }


    const target =
        data.events.find(
            event =>
                event.id === id
        );


    if (!target) return;


    if (
        !confirm(
            `「${target.name}」を削除しますか？`
        )
    ) {

        return;

    }


    data.events =
        data.events.filter(
            event =>
                event.id !== id
        );


    if (
        data.currentEventId === id
    ) {

        data.currentEventId =
            data.events[0].id;

    }


    saveData();

    renderAll();

}


/* =====================================================
   Add Group
===================================================== */

function addGroup() {

    const name =
        prompt(
            "グループ名を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) {

        return;

    }


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
   Render Groups
===================================================== */

function renderGroups() {

    const container =
        $("groupList");


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
                        Number(
                            member.groupId
                        ) ===
                        Number(
                            group.id
                        )
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

            deleteButton.type =
                "button";

            deleteButton.textContent =
                "×";


            if (
                Number(group.id) === 1
            ) {

                deleteButton.style.display =
                    "none";

            }
            else {

                deleteButton.addEventListener(
                    "click",
                    () => {

                        deleteGroup(
                            group.id
                        );

                    }
                );

            }


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
   Delete Group
===================================================== */

function deleteGroup(id) {

    if (
        Number(id) === 1
    ) {

        alert(
            "未所属グループは削除できません。"
        );

        return;

    }


    const group =
        data.groups.find(
            item =>
                item.id === id
        );


    if (!group) return;


    if (
        !confirm(
            `「${group.name}」を削除しますか？`
        )
    ) {

        return;

    }


    data.members.forEach(
        member => {

            if (
                Number(
                    member.groupId
                ) ===
                Number(id)
            ) {

                member.groupId = 1;

            }

        }
    );


    data.groups =
        data.groups.filter(
            item =>
                item.id !== id
        );


    if (
        selectedGroupFilter === id
    ) {

        selectedGroupFilter =
            "all";

    }


    saveData();

    renderAll();

}


/* =====================================================
   Render Group Filter
===================================================== */

function renderGroupFilter() {

    const container =
        $("groupFilter");


    if (!container) return;


    container.innerHTML = "";


    const allButton =
        document.createElement(
            "button"
        );


    allButton.type =
        "button";

    allButton.className =
        "filter-btn";


    if (
        selectedGroupFilter === "all"
    ) {

        allButton.classList.add(
            "active"
        );

    }


    allButton.textContent =
        "全員";


    allButton.addEventListener(
        "click",
        () => {

            selectedGroupFilter =
                "all";

            renderGroupFilter();

            renderMembers();

        }
    );


    container.appendChild(
        allButton
    );


    data.groups.forEach(
        group => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";

            button.className =
                "filter-btn";


            if (
                selectedGroupFilter ===
                group.id
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.textContent =
                group.name;


            button.addEventListener(
                "click",
                () => {

                    selectedGroupFilter =
                        group.id;

                    renderGroupFilter();

                    renderMembers();

                }
            );


            container.appendChild(
                button
            );

        }
    );

}


/* =====================================================
   Render Members
===================================================== */

function renderMembers() {

    const container =
        $("memberList");


    if (!container) return;


    container.innerHTML = "";


    const event =
        getCurrentEvent();


    if (!event) {

        return;

    }


    let members =
        [...data.members];


    if (
        selectedGroupFilter !== "all"
    ) {

        members =
            members.filter(
                member =>
                    Number(
                        member.groupId
                    ) ===
                    Number(
                        selectedGroupFilter
                    )
            );

    }


    if (
        members.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.style.color =
            "#6b7280";

        empty.style.fontSize =
            "13px";

        empty.textContent =
            "メンバーがいません。";

        container.appendChild(
            empty
        );

        return;

    }


    members.forEach(
        member => {

            const status =
                event.members[
                    member.id
                ] ||
                "unpaid";


            const group =
                data.groups.find(
                    item =>
                        Number(
                            item.id
                        ) ===
                        Number(
                            member.groupId
                        )
                );


            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "member-card";


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


            if (group) {

                card.classList.add(
                    "group-colored"
                );

                card.style.setProperty(
                    "--group-color",
                    group.color
                );

            }


            card.addEventListener(
                "click",
                eventObject => {

                    if (
                        eventObject.target.closest(
                            "button"
                        )
                    ) {

                        return;

                    }


                    togglePayment(
                        member.id
                    );

                }
            );


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


            const renameButton =
                createMemberButton(
                    "名前変更",
                    "group-btn",
                    () =>
                        renameMember(
                            member.id
                        )
                );


            const attendanceButton =
                createMemberButton(

                    status === "absent"
                        ? "参加に戻す"
                        : "不参加",

                    "absent-btn",

                    () =>
                        toggleAttendance(
                            member.id
                        )

                );


            const groupButton =
                createMemberButton(

                    "グループ",

                    "group-btn",

                    () =>
                        changeMemberGroup(
                            member.id
                        )

                );


            const upButton =
                createMemberButton(

                    "↑",

                    "sort-btn",

                    () =>
                        moveMember(
                            member.id,
                            -1
                        )

                );


            const downButton =
                createMemberButton(

                    "↓",

                    "sort-btn",

                    () =>
                        moveMember(
                            member.id,
                            1
                        )

                );


            const deleteButton =
                createMemberButton(

                    "削除",

                    "delete-member",

                    () =>
                        deleteMember(
                            member.id
                        )

                );


            actions.appendChild(
                renameButton
            );

            actions.appendChild(
                attendanceButton
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
   Create Member Button
===================================================== */

function createMemberButton(
    text,
    className,
    handler
) {

    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.className =
        className;

    button.textContent =
        text;

    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            handler();

        }
    );


    return button;

}


/* =====================================================
   Add Member
===================================================== */

function addMember() {

    const name =
        prompt(
            "メンバーの名前を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) {

        return;

    }


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

            if (
                !event.members
            ) {

                event.members = {};

            }


            event.members[
                newMember.id
            ] =
                "unpaid";

        }
    );


    saveData();

    renderAll();

}


/* =====================================================
   Rename Member
===================================================== */

function renameMember(
    memberId
) {

    const member =
        data.members.find(
            item =>
                item.id === memberId
        );


    if (!member) return;


    const name =
        prompt(
            "新しい名前を入力してください",
            member.name
        );


    if (
        !name ||
        !name.trim()
    ) {

        return;

    }


    member.name =
        name.trim();


    saveData();

    renderAll();

}


/* =====================================================
   Delete Member
===================================================== */

function deleteMember(
    id
) {

    const member =
        data.members.find(
            item =>
                item.id === id
        );


    if (!member) return;


    if (
        !confirm(
            `${member.name}を削除しますか？`
        )
    ) {

        return;

    }


    data.members =
        data.members.filter(
            item =>
                item.id !== id
        );


    data.events.forEach(
        event => {

            if (
                event.members
            ) {

                delete event.members[id];

            }

        }
    );


    saveData();

    renderAll();

}


/* =====================================================
   Move Member
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


    if (index === -1) {

        return;

    }


    const newIndex =
        index + direction;


    if (
        newIndex < 0 ||
        newIndex >= data.members.length
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
   Sort Members
===================================================== */

function sortMembersByName() {

    if (
        !confirm(
            "メンバーを名前順に並べ替えますか？"
        )
    ) {

        return;

    }


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
   Change Group
===================================================== */

function changeMemberGroup(
    memberId
) {

    const member =
        data.members.find(
            item =>
                item.id ===
                memberId
        );


    if (!member) return;


    if (
        data.groups.length <= 1
    ) {

        alert(
            "先にグループを追加してください。"
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
        prompt(
            message
        );


    if (!answer) return;


    const index =
        Number(answer) - 1;


    if (
        !Number.isInteger(index) ||
        !data.groups[index]
    ) {

        alert(
            "正しい番号を入力してください。"
        );

        return;

    }


    member.groupId =
        data.groups[index].id;


    saveData();

    renderAll();

}


/* =====================================================
   Toggle Payment
===================================================== */

function togglePayment(
    memberId
) {

    const event =
        getCurrentEvent();


    if (!event) return;


    const current =
        event.members[
            memberId
        ] ||
        "unpaid";


    if (
        current === "absent"
    ) {

        alert(
            "先に「参加に戻す」を押してください。"
        );

        return;

    }


    event.members[
        memberId
    ] =
        current === "paid"
            ? "unpaid"
            : "paid";


    saveData();

    renderMembers();

    updateStats();

    renderFinance();

}


/* =====================================================
   Toggle Attendance
===================================================== */

function toggleAttendance(
    memberId
) {

    const event =
        getCurrentEvent();


    if (!event) return;


    const current =
        event.members[
            memberId
        ] ||
        "unpaid";


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
   Bulk Absent
===================================================== */

function bulkAbsent() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const members =
        selectedGroupFilter === "all"

            ? [...data.members]

            : data.members.filter(
                member =>
                    Number(
                        member.groupId
                    ) ===
                    Number(
                        selectedGroupFilter
                    )
            );


    if (
        members.length === 0
    ) {

        alert(
            "対象となるメンバーがいません。"
        );

        return;

    }


    const targetName =
        selectedGroupFilter === "all"

            ? "全員"

            : (
                data.groups.find(
                    group =>
                        Number(
                            group.id
                        ) ===
                        Number(
                            selectedGroupFilter
                        )
                )?.name ||
                "選択グループ"
            );


    if (
        !confirm(
            `${targetName}を一括で不参加にしますか？`
        )
    ) {

        return;

    }


    members.forEach(
        member => {

            event.members[
                member.id
            ] =
                "absent";

        }
    );


    saveData();

    renderAll();

}


/* =====================================================
   Bulk Present
===================================================== */

function bulkPresent() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const members =
        selectedGroupFilter === "all"

            ? [...data.members]

            : data.members.filter(
                member =>
                    Number(
                        member.groupId
                    ) ===
                    Number(
                        selectedGroupFilter
                    )
            );


    if (
        members.length === 0
    ) {

        return;

    }


    if (
        !confirm(
            "対象メンバーを参加に戻しますか？"
        )
    ) {

        return;

    }


    members.forEach(
        member => {

            event.members[
                member.id
            ] =
                "unpaid";

        }
    );


    saveData();

    renderAll();

}


/* =====================================================
   Update Stats
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
                ] ||
                "unpaid";


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
        Number(
            event.fee || 0
        );


    const remaining =
        unpaid *
        Number(
            event.fee || 0
        );


    setText(
        "participantCount",
        participants + "人"
    );


    setText(
        "paidCount",
        paid + "人"
    );


    setText(
        "unpaidCount",
        unpaid + "人"
    );


    setText(
        "absentCount",
        absent + "人"
    );


    setText(
        "collectedMoney",
        "¥" +
        collected.toLocaleString()
    );


    setText(
        "remainingMoney",
        "¥" +
        remaining.toLocaleString()
    );

}


/* =====================================================
   Set Text
===================================================== */

function setText(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* =====================================================
   Add Income
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
    ) {

        return;

    }


    const input =
        prompt(
            "金額を入力してください"
        );


    if (
        input === null
    ) {

        return;

    }


    const amount =
        Number(input);


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "正しい金額を入力してください。"
        );

        return;

    }


    event.income.push({

        id:
            Date.now(),

        name:
            name.trim(),

        amount,

        date:
            new Date()
                .toLocaleDateString(
                    "ja-JP"
                )

    });


    saveData();

    renderFinance();

    updateOverallFinance();

}


/* =====================================================
   Add Expense
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
    ) {

        return;

    }


    const input =
        prompt(
            "金額を入力してください"
        );


    if (
        input === null
    ) {

        return;

    }


    const amount =
        Number(input);


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "正しい金額を入力してください。"
        );

        return;

    }


    event.expenses.push({

        id:
            Date.now(),

        name:
            name.trim(),

        amount,

        date:
            new Date()
                .toLocaleDateString(
                    "ja-JP"
                )

    });


    saveData();

    renderFinance();

    updateOverallFinance();

}


/* =====================================================
   Render Finance
===================================================== */

function renderFinance() {

    const event =
        getCurrentEvent();


    if (!event) return;


    if (
        !Array.isArray(
            event.income
        )
    ) {

        event.income = [];

    }


    if (
        !Array.isArray(
            event.expenses
        )
    ) {

        event.expenses = [];

    }


    const participationList =
        $("participationIncomeList");

    const incomeList =
        $("incomeList");

    const expenseList =
        $("expenseList");


    if (participationList) {

        participationList.innerHTML =
            "";

    }


    if (incomeList) {

        incomeList.innerHTML =
            "";

    }


    if (expenseList) {

        expenseList.innerHTML =
            "";

    }


    let paidCount = 0;


    Object.entries(
        event.members || {}
    ).forEach(
        ([memberId, status]) => {

            if (
                status !== "paid"
            ) {

                return;

            }


            paidCount++;


            const member =
                data.members.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            memberId
                        )
                );


            if (
                !member ||
                !participationList
            ) {

                return;

            }


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
                Number(
                    event.fee
                ).toLocaleString();


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
    );


    const participationIncome =
        paidCount *
        (
            Number(
                event.fee
            ) || 0
        );


    let otherIncome = 0;


    event.income.forEach(
        item => {

            otherIncome +=
                Number(
                    item.amount
                ) || 0;


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
                Number(
                    item.amount
                ) || 0;


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


    const balance =
        participationIncome +
        otherIncome -
        expenseTotal;


    setText(

        "participationIncomeTotal",

        "¥" +
        participationIncome
            .toLocaleString()

    );


    setText(

        "otherIncomeTotal",

        "¥" +
        otherIncome
            .toLocaleString()

    );


    setText(

        "expenseTotal",

        "¥" +
        expenseTotal
            .toLocaleString()

    );


    setText(

        "balanceTotal",

        "¥" +
        balance
            .toLocaleString()

    );

}


/* =====================================================
   Finance Item
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
        Number(
            item.amount
        ).toLocaleString();


    const deleteButton =
        document.createElement(
            "button"
        );

    deleteButton.type =
        "button";

    deleteButton.className =
        "delete-finance";

    deleteButton.textContent =
        "×";


    deleteButton.addEventListener(
        "click",
        () => {

            deleteFinanceItem(
                type,
                item.id
            );

        }
    );


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
   Delete Finance Item
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

    updateOverallFinance();

}


/* =====================================================
   Change Fee
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
    ) {

        return;

    }


    const newFee =
        Number(input);


    if (
        !Number.isFinite(newFee) ||
        newFee < 0
    ) {

        alert(
            "正しい金額を入力してください。"
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
   Calculator
===================================================== */

function calculateCustom() {

    const peopleElement =
        $("calcPeople");

    const totalElement =
        $("calcTotal");

    const resultElement =
        $("calcPerPerson");


    if (
        !peopleElement ||
        !totalElement ||
        !resultElement
    ) {

        return;

    }


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
   Reset Current Event
===================================================== */

function resetCurrentEvent() {

    const event =
        getCurrentEvent();


    if (!event) return;


    if (
        !confirm(
            `「${event.name}」の支払い状況を全て未払いに戻しますか？`
        )
    ) {

        return;

    }


    event.members = {};


    saveData();

    renderAll();

}


/* =====================================================
   Reset All Data
===================================================== */

async function resetAllData() {

    if (
        !confirm(
            "全てのデータを削除します。\n本当に削除しますか？"
        )
    ) {

        return;

    }


    if (
        !confirm(
            "この操作は元に戻せません。本当に全データを削除しますか？"
        )
    ) {

        return;

    }


    data =
        structuredClone(
            DEFAULT_DATA
        );


    saveLocalOnly();


    const ref =
        getCloudDataRef();


    if (ref) {

        try {

            await setDoc(

                ref,

                {

                    data:
                        structuredClone(
                            DEFAULT_DATA
                        ),

                    updatedAt:
                        new Date()
                            .toISOString()

                }

            );

        }
        catch (error) {

            console.error(
                "Cloud reset error:",
                error
            );

        }

    }


    renderAll();

    showCloudStatus(
        "🗑️ 全データを削除しました"
    );

}


/* =====================================================
   Export
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


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;

    link.download =
        "CircleAccounting_backup.json";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


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
   Import
===================================================== */

function importData(
    event
) {

    const file =
        event.target.files?.[0];


    if (!file) {

        return;

    }


    const reader =
        new FileReader();


    reader.onload =
        async eventObject => {

            try {

                const imported =
                    JSON.parse(
                        eventObject.target.result
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
                        "Invalid backup file"
                    );

                }


                normalizeData(
                    imported
                );


                if (
                    !confirm(
                        "現在のデータをバックアップデータに置き換えますか？"
                    )
                ) {

                    return;

                }


                data =
                    imported;


                saveLocalOnly();


                await saveToCloud();


                renderAll();


                alert(
                    "データを復元しました！"
                );

            }
            catch (error) {

                console.error(
                    "Import error:",
                    error
                );


                alert(
                    "バックアップファイルを読み込めませんでした。"
                );

            }
            finally {

                event.target.value =
                    "";

            }

        };


    reader.readAsText(
        file
    );

}


/* =====================================================
   Overall Finance
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
                    Number(
                        event.fee
                    ) || 0
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


    setText(

        "overallIncome",

        "¥" +
        totalIncome.toLocaleString()

    );


    setText(

        "overallExpense",

        "¥" +
        totalExpense.toLocaleString()

    );


    setText(

        "overallBalance",

        "¥" +
        balance.toLocaleString()

    );

}


/* =====================================================
   Update User Display
===================================================== */

function updateUserDisplay() {

    const element =
        $("userEmail");


    if (!element) return;


    element.textContent =
        currentUser?.email || "";

}


/* =====================================================
   Authentication State
===================================================== */

function setupAuthentication() {

    if (!auth) {

        console.error(
            "Firebase Authentication is unavailable."
        );

        showAuthMessage(
            "Firebase Authenticationに接続できません。"
        );

        return;

    }


    onAuthStateChanged(

        auth,

        async user => {

            console.log(
                "🔐 Auth state:",
                user
                    ? user.email
                    : "logged out"
            );


            /*
                LOGGED OUT
            */

            if (!user) {

                currentUser =
                    null;

                showLogin();

                authInitialized =
                    true;

                return;

            }


            /*
                LOGGED IN
            */

            currentUser =
                user;


            updateUserDisplay();


            /*
                ユーザー専用LocalStorage
            */

            data =
                loadLocalData();


            /*
                まず画面表示
            */

            showApp();

            renderAll();


            /*
                Firestoreから取得
            */

            await loadFromCloud();


            /*
                クラウド取得後再描画
            */

            renderAll();


            updateUserDisplay();


            showCloudStatus(
                "☁️ ログイン・クラウド接続完了"
            );


            authInitialized =
                true;

        }

    );

}


/* =====================================================
   Event Listeners
===================================================== */

function setupEventListeners() {

    /*
        Authentication
    */

    $("authMainButton")
        ?.addEventListener(
            "click",
            handleAuth
        );


    $("authModeButton")
        ?.addEventListener(
            "click",
            () => {

                authMode =
                    authMode === "login"
                        ? "register"
                        : "login";

                updateAuthMode();

            }
        );


    $("resetPasswordButton")
        ?.addEventListener(
            "click",
            resetPassword
        );


    $("authPassword")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    handleAuth();

                }

            }
        );


    $("authEmail")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    $("authPassword")
                        ?.focus();

                }

            }
        );


    /*
        Header
    */

    $("logoutButton")
        ?.addEventListener(
            "click",
            logout
        );


    $("exportButton")
        ?.addEventListener(
            "click",
            exportData
        );


    $("importFile")
        ?.addEventListener(
            "change",
            importData
        );


    /*
        Events
    */

    $("addEventButton")
        ?.addEventListener(
            "click",
            addEvent
        );


    $("changeFeeButton")
        ?.addEventListener(
            "click",
            changeFee
        );


    /*
        Finance
    */

    $("addIncomeButton")
        ?.addEventListener(
            "click",
            addIncome
        );


    $("addExpenseButton")
        ?.addEventListener(
            "click",
            addExpense
        );


    /*
        Groups
    */

    $("addGroupButton")
        ?.addEventListener(
            "click",
            addGroup
        );


    /*
        Members
    */

    $("addMemberButton")
        ?.addEventListener(
            "click",
            addMember
        );


    $("bulkAbsentButton")
        ?.addEventListener(
            "click",
            bulkAbsent
        );


    $("bulkPresentButton")
        ?.addEventListener(
            "click",
            bulkPresent
        );


    $("sortMembersButton")
        ?.addEventListener(
            "click",
            sortMembersByName
        );


    /*
        Calculator
    */

    $("calcPeople")
        ?.addEventListener(
            "input",
            calculateCustom
        );


    $("calcTotal")
        ?.addEventListener(
            "input",
            calculateCustom
        );


    /*
        Settings
    */

    $("resetCurrentEventButton")
        ?.addEventListener(
            "click",
            resetCurrentEvent
        );


    $("resetAllDataButton")
        ?.addEventListener(
            "click",
            resetAllData
        );

}


/* =====================================================
   Startup
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🚀 Circle Accounting started"
        );


        /*
            最初はログイン画面を表示
        */

        showLogin();


        /*
            初期モード
        */

        updateAuthMode();


        /*
            ボタンイベント
        */

        setupEventListeners();


        /*
            Firebase認証開始
        */

        if (
            firebaseReady
        ) {

            setupAuthentication();

        }
        else {

            showAuthMessage(
                "Firebaseを初期化できませんでした。"
            );

        }


        /*
            初期計算機
        */

        calculateCustom();

    }
);