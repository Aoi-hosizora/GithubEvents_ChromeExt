const storage = chrome.storage.sync || chrome.storage.local;
const PIN_FLAG = 'ah-is-pin';
const GWIDTH_FLAG = 'ah-g-width';
const TOKEN_FLAG = 'ah-github-events-token';

document.addEventListener('DOMContentLoaded', () => {

    console.log("Loading Ext Start");

    // 获得 repo | user
    urlType = checkURL();

    if (urlType) {
        // HTML 标签
        injectJs(urlType);

        getStorage((st) => {

            // 初始化 Ext 数据
            initData(st, urlType);
            // 初始化 Ext 界面
            initUI(urlType);

            // 注册事件
            regEvent();

            console.log("Loading Ext Finish");

            // 获取数据
            getDataAjax();
        })
    } else
        console.log("Loading Ext Finish (Url Not For Events)");
})

/**
 * 添加 HTML
 * @param {*} urlType 
 */
function injectJs(urlType) {

    // div (toggle)
    var divTag = document.createElement('div');
    divTag.className = 'ah-content-toggle ah-content-toggle-hide ah-content-trans';
    divTag.id = 'ahid-toggle';
    divTag.innerHTML = `
    <svg width=10 height=14 viewBox="0 0 320 512">
        <path fill="#999999" d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
    </svg>
    <span>Events</span>
    `;
    divTag.onload = () => this.parent.removeChild(this);

    // nav

    var ahid_title_as = '';

    if (urlType.type == 'repo')
        ahid_title_as = `
            <span id="ahid-repo-icon"></span>
            <a id="ahid-title-user" class="ah-title-head-a" href="${urlType.user_url}" target="_blank">${urlType.username}</a> /
            <a id="ahid-title-repo" class="ah-title-head-a" href="${urlType.repo_url}" target="_blank">${urlType.repo}</a>
        `;
    else if (urlType.type == 'user')
        ahid_title_as = `
            <span id="ahid-user-icon"></span>
            <a id="ahid-title-user" class="ah-title-head-a" href="${urlType.user_url}" target="_blank">${urlType.username}</a>
        `;

    var navTag = document.createElement('nav');
    navTag.className = 'ah-content-nav ah-content-trans';
    navTag.id = 'ahid-nav';
    navTag.innerHTML = `
    <div id="ahid-head">
        <a id="ahid-pin" href="#" title="Pin">
            <svg width=9 height=14 viewBox="0 0 384 512">
                <path d="M298.028 214.267L285.793 96H328c13.255 0 24-10.745 24-24V24c0-13.255-10.745-24-24-24H56C42.745 0 32 10.745 32 24v48c0 13.255 10.745 24 24 24h42.207L85.972 214.267C37.465 236.82 0 277.261 0 328c0 13.255 10.745 24 24 24h136v104.007c0 1.242.289 2.467.845 3.578l24 48c2.941 5.882 11.364 5.893 14.311 0l24-48a8.008 8.008 0 0 0 .845-3.578V352h136c13.255 0 24-10.745 24-24-.001-51.183-37.983-91.42-85.973-113.733z"></path>
            </svg>
        </a>
        <a id="ahid-feedback" href="#" title="Feedback">
            <svg width=14 height=14 viewBox="0 0 24 24">
                <path fill="#999" d="M20,2L4,2c-1.1,0 -1.99,0.9 -1.99,2L2,22l4,-4h14c1.1,0 2,-0.9 2,-2L22,4c0,-1.1 -0.9,-2 -2,-2zM13,14h-2v-2h2v2zM13,10h-2L11,6h2v4z"></path>
            </svg>
        </a>
        <div id="ahid-title">
            ${ahid_title_as}
        </div>
        <div id="ahid-subtitle">
            <span>${(urlType.type == 'repo') ? 'Repo' : 'User'} Events</span>
        </div>
    </div>

    <div id="ahid-tail">
        <div id="ahid-content"></div>

        <div id="ahid-foot">
            <div id="ahid-more-div">
                <a id="ahid-more-a" href="#">More...</a>
            </div>
            <div id="ahid-loading-label">Loading...</div>
        </div>

        <div id="ahid-resize-handler"></div>
    </div>
    `;
    navTag.onload = () => this.parent.removeChild(this);

    // ul
    var ulTag = document.createElement('ul');
    ulTag.id = "ahid-ul";
    ulTag.onload = () => this.parent.removeChild(ulTag);

    document.body.append(divTag);
    document.body.append(navTag);
    $('#ahid-content').append(ulTag);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 初始化数据
 */
function initData(st, urlType) {

    if (urlType.type == 'user')
        url = `https://api.github.com/users/${urlType.username}/events?page=`;
    else if (urlType.type == 'repo')
        url = `https://api.github.com/repos/${urlType.username}/${urlType.repo}/events?page=`;

    // console.log(url);

    page = 1;
    firstFlag = true;

    isPin = st.pin;
    gwidth = st.gw;
    token = st.token;

    feedback_url = "https://github.com/Aoi-hosizora/GithubEvents_ChromeExt/issues";
}

function initUI() {

    // Label
    showLoading(true);

    // pin
    setPin(isPin);

    // 展开
    if (isPin)
        closeNav(false);
    else {
        closeNav(true);
    }

    // Resize
    bindResize();
    refreshPadding();

    // title-icon
    $('#ahid-repo-icon').html(getSvgTag('CreateEvent', "#fff"));
    $('#ahid-user-icon').html(getSvgTag('MemberEvent', "#fff"));
}

/**
 * 数据获取，DOM 操作
 */
function getDataAjax() {

    // 异步获取
    ajax(url, page, token, (events) => {
        addEvents(events);
        showLoading(false);
    }, () => {
        showLoading(false, true);
    });
}

/**
 * 检查 URL，返回信息
 */
function checkURL() {

    var preserveKeyWord = [
        '', 'pulls', 'issues', 'marketplace', 'explore', 'notifications',
        'new', 'login', 'organizations', 'settings'
    ];

    var url = document.URL
        .replace(/[https:\/\/|http:\/\/]*[.*\.]*github\.com\//, "")
        .replace("#", "")

    url = url.split('/');

    // console.log(url);
    // console.log(url.length);

    if (url.length == 0) return null;
    if (preserveKeyWord.includes(url[0])) return null;

    if (url.length == 1) {
        return {
            type: 'user',
            username: url[0],
            user_url: document.URL
        }
    } else if (url.length >= 2) {
        // https://github.com/Aoi-hosizora/NNS_Android/blob/master/.metadata
        user_url = document.URL.split('/');
        user_url = user_url.slice(0, 4).join('/')

        repo_url = document.URL.split('/');
        repo_url = repo_url.slice(0, 5).join('/')

        return {
            type: 'repo',
            username: url[0],
            repo: url[1],
            user_url: user_url,
            repo_url: repo_url
        }
    }
    return null;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 加载数据 TODO
 * @param {*} fb `(st) => {}`
 */
function getStorage(fb) {
    storage.get(PIN_FLAG, (storedData) => {
        var pin_flag = storedData[PIN_FLAG];

        storage.get(GWIDTH_FLAG, (storedData) => {
            var gwidth_flag = storedData[GWIDTH_FLAG];

            storage.get(TOKEN_FLAG, (storedData) => {
                var token_flag = storedData[TOKEN_FLAG];

                // console.log(pin_flag)
                // console.log(gwidth_flag)
                // console.log(token_flag)

                fb({
                    pin: pin_flag,
                    gw: gwidth_flag,
                    token: token_flag
                });

            });
        });
    });
}

/**
 * 保存数据
 * @param {*} flag `pin` `gwidth`
 * @param {*} value 
 */
function setStorage(flag, value) {

    const obj = {}

    if (flag == 'pin') {
        obj[PIN_FLAG] = value;
        storage.set(obj, () => {
            // console.log(obj[PIN_FLAG]);
        });
    } else if (flag == 'gwidth') {
        obj[GWIDTH_FLAG] = value;
        storage.set(obj, () => {
            // console.log(obj[GWIDTH_FLAG]);
        });
    }
}