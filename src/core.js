(function () {
    var users = JSON.parse(localStorage.getItem('acorn_users')) || [
        { userId: 'u1', username: 'demo', password: '123456' },
        { userId: 'u2', username: '李老师', password: '111111' }
    ];
    var classes = JSON.parse(localStorage.getItem('acorn_classes')) || [
        { classId: 'c1', className: '阳光三班', teacherId: 'u1', students: [] },
        { classId: 'c2', className: '星辰中队', teacherId: 'u1', students: [] }
    ];
    var currentUser = JSON.parse(localStorage.getItem('acorn_current_user')) || null;
    var currentClass = JSON.parse(localStorage.getItem('acorn_current_class')) || null;
    var usedCodes = JSON.parse(localStorage.getItem('acorn_used_codes')) || [];

    function saveAll() {
        localStorage.setItem('acorn_users', JSON.stringify(users));
        localStorage.setItem('acorn_classes', JSON.stringify(classes));
        localStorage.setItem('acorn_used_codes', JSON.stringify(usedCodes));
        if (currentUser) {
            localStorage.setItem('acorn_current_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('acorn_current_user');
        }
        if (currentClass) {
            localStorage.setItem('acorn_current_class', JSON.stringify(currentClass));
        } else {
            localStorage.removeItem('acorn_current_class');
        }
    }

    function validateCode(code) {
        if(!code) return false;
        if(!code.startsWith('XG7-') && !code.startsWith('XGP-')) return false;
        let parts = code.split('-');
        if(parts.length !== 4) return false;
        let p1 = parts[1];
        let p2 = parts[2];
        let p3 = parts[3];
        if(p1.length !== 4 || p2.length !== 4) return false;
        let sum = 0;
        for(let i=0; i<4; i++) sum += p1.charCodeAt(i);
        for(let i=0; i<4; i++) sum += p2.charCodeAt(i);
        let check = (sum * 13) % 1024;
        let expected = check.toString(36).padStart(2, '0').toUpperCase();
        return expected === p3;
    }

    var authView = document.getElementById('auth-view');
    var classroomView = document.getElementById('classroom-view');
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');

    // Tab 切换
    document.querySelectorAll('.auth-tab').forEach(function (t) {
        t.onclick = function () {
            document.querySelectorAll('.auth-tab').forEach(function (x) { x.classList.remove('active'); });
            t.classList.add('active');
            loginForm.style.display = t.dataset.mode === 'login' ? 'block' : 'none';
            registerForm.style.display = t.dataset.mode === 'register' ? 'block' : 'none';
        };
    });
    document.getElementById('go-register-link').onclick = function () { document.querySelector('.auth-tab[data-mode="register"]').click(); };
    document.getElementById('go-login-link').onclick = function () { document.querySelector('.auth-tab[data-mode="login"]').click(); };

    // 登录
    document.getElementById('login-btn').onclick = function () {
        var name = document.getElementById('login-username').value.trim();
        var pwd = document.getElementById('login-password').value;
        var user = users.find(function (u) { return u.username === name && u.password === pwd; });
        if (!user) { alert('用户名或密码错误'); return; }
        currentUser = user;
        saveAll();
        showClassroom();
    };

    // 注册
    document.getElementById('register-btn').onclick = function () {
        var name = document.getElementById('reg-username').value.trim();
        var pwd = document.getElementById('reg-password').value;
        var pwd2 = document.getElementById('reg-password2').value;
        if (!name || !pwd) { alert('请填写完整'); return; }
        if (pwd !== pwd2) { alert('两次密码不一致'); return; }
        if (users.find(function (u) { return u.username === name; })) { alert('用户名已存在'); return; }
        users.push({ userId: 'u_' + Date.now(), username: name, password: pwd });
        saveAll();
        alert('注册成功！请登录');
        document.querySelector('.auth-tab[data-mode="login"]').click();
        document.getElementById('login-username').value = name;
        document.getElementById('login-password').value = '';
    };

    function showClassroom() {
        authView.style.display = 'none';
        classroomView.style.display = 'flex';
        renderClassCards();
    }

    function renderClassCards() {
        var container = document.getElementById('classroom-list-container');
        var myClasses = classes.filter(function (c) { return c.teacherId === currentUser.userId; });
        var html = myClasses.map(function (cls) {
            let isExpired = cls.expireTime && Date.now() > cls.expireTime;
            let statusText = '';
            if (cls.expireTime) {
                if (isExpired) {
                    statusText = '<span style="color:#ef4444;font-weight:bold;">⚠️ 试用已过期</span>';
                } else {
                    let daysLeft = Math.ceil((cls.expireTime - Date.now()) / (1000 * 3600 * 24));
                    statusText = '<span style="color:#f59e0b;">⏳ 试用期剩 ' + daysLeft + ' 天</span>';
                }
            } else {
                statusText = '<span style="color:#10b981;">💎 永久授权</span>';
            }

            return '<div class="class-card" data-classid="' + cls.classId + '" style="position:relative;' + (isExpired ? 'filter:grayscale(0.8);' : '') + '">' +
                '<div class="delete-class-btn" data-delid="' + cls.classId + '" style="position:absolute;top:8px;right:8px;color:#ff4757;background:rgba(255,255,255,0.8);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.1);" title="删除班级">🗑️</div>' +
                '<div class="class-emoji">🌳</div>' +
                '<div class="class-name">' + cls.className + '</div>' +
                '<div style="font-size:12px;margin-top:6px;">' + statusText + '</div>' +
                '<div style="font-size:13px;color:#5a7a5a;margin-top:4px;">' + (cls.students || []).length + ' 名学生</div>' +
                '</div>';
        }).join('');
        html += '<div class="class-card add-class-card" id="create-class-card">' +
            '<div class="class-emoji">➕</div>' +
            '<div class="class-name">创建新班级</div></div>';
        container.innerHTML = html;

        document.querySelectorAll('.class-card[data-classid]').forEach(function (c) {
            c.onclick = function () { enterClass(c.dataset.classid); };
        });
        document.querySelectorAll('.delete-class-btn').forEach(function (btn) {
            btn.onclick = function (e) {
                e.stopPropagation();
                var classId = this.dataset.delid;
                var cls = classes.find(function (c) { return c.classId === classId; });
                if (confirm('确定要删除班级【' + cls.className + '】吗？此操作不可恢复。')) {
                    classes = classes.filter(function (c) { return c.classId !== classId; });
                    saveAll();
                    renderClassCards();
                }
            };
        });
        document.getElementById('create-class-card').onclick = function () {
            document.getElementById('new-class-name').value = '';
            document.getElementById('activation-code').value = '';
            document.getElementById('create-class-modal').style.display = 'flex';
        };
    }

    function enterClass(classId) {
        currentClass = classes.find(function (c) { return c.classId === classId; });
        if (!currentClass) return;

        // Check Expiration
        if (currentClass.expireTime && Date.now() > currentClass.expireTime) {
            let newCode = prompt('⚠️ 试用已过期，该班级已被冻结！\n请输入永久激活码 (XGP-...) 恢复访问：');
            if (!newCode) return;
            if (!validateCode(newCode) || !newCode.startsWith('XGP-')) {
                alert('❌ 激活码无效或不是永久码！');
                return;
            }
            if (usedCodes.includes(newCode)) {
                alert('⚠️ 该激活码已被使用！');
                return;
            }
            usedCodes.push(newCode);
            delete currentClass.expireTime;
            saveAll();
            alert('✅ 成功升级为永久班级！感谢您的支持。');
            renderClassCards();
            return;
        }

        if (!currentClass.students) currentClass.students = [];
        saveAll();

        localStorage.setItem('acorn_data_v7', JSON.stringify(currentClass.students));

        authView.style.display = 'none';
        classroomView.style.display = 'none';

        if (typeof students !== 'undefined') {
            students = JSON.parse(localStorage.getItem('acorn_data_v7')) || [];
            if (typeof renderBoard === 'function') renderBoard();
        }

        setInterval(function () {
            if (currentClass && typeof students !== 'undefined') {
                currentClass.students = students;
                saveAll();
            }
        }, 2000);
    }

    // 退出登录
    document.getElementById('logout-from-classroom').onclick = function () {
        currentUser = null; currentClass = null;
        saveAll();
        classroomView.style.display = 'none';
        authView.style.display = 'flex';
        document.getElementById('login-password').value = '';
    };

    // 创建班级
    document.getElementById('confirm-create-class').onclick = function () {
        var name = document.getElementById('new-class-name').value.trim();
        var code = document.getElementById('activation-code').value.trim();

        if (!name) { alert('请输入班级名称'); return; }
        if (!code) { alert('请输入激活码'); return; }

        if (!validateCode(code)) {
            alert('❌ 激活码格式错误或无效！请检查是否输入错误。');
            return;
        }

        if (usedCodes.includes(code)) {
            alert('⚠️ 该激活码已被使用！一个激活码只能使用一次。');
            return;
        }

        usedCodes.push(code);

        let expireTime = null;
        if (code.startsWith('XG7-')) {
            expireTime = Date.now() + 7 * 24 * 3600 * 1000;
        }

        classes.push({ classId: 'cls_' + Date.now(), className: name, teacherId: currentUser.userId, students: [], expireTime: expireTime });
        saveAll();
        document.getElementById('create-class-modal').style.display = 'none';
        renderClassCards();

        if (expireTime) alert('✅ 激活成功！您获得了 7 天试用期。');
        else alert('✅ 激活成功！永久授权。');
    };

    document.getElementById('cancel-create-class').onclick = function () {
        document.getElementById('create-class-modal').style.display = 'none';
    };

    if (currentClass && currentUser) {
        enterClass(currentClass.classId);
    } else if (currentUser) {
        showClassroom();
    }
})();
