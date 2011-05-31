 Function.prototype.extend = function (superClass) {
    var Inheritance = function () { };
    Inheritance.prototype = superClass.prototype;

    this.prototype = new Inheritance();
    this.prototype.constructor = this;
    this.superClass = superClass;
}

window.Module = function () { //Абстрактный класс с базовой реализацией функционала
    var window; //Скрываем ссылки на объекты браузера
    var document; //Скрываем ссылки на объекты браузера
    var self = this;
    var poll = $('script[id=core]'); //Ссылка на ядро

    this.context; //Ссылка на контекст модуля

    this.id; //Уникальное постоянное имя модуля (crc32 функция от параметров, с которыми загружен этот модуль и имени библиотеки)

    this.param; //Параметры, с которыми был вызван модуль

    this.entry = function (message) { //Точка входа в модуль для ядра, через него происходит оповещение модулей обо всем что происходит
        switch (message.event) {
            case "binding": //Вызывается один раз, при инициализации модуля
                poll.trigger({ type: "msg", header: "complete", body: { id: message.id} }); //Сообщаем ядру что модуль готов к работе

                this.id = message.id;
                this.context = message.context;
                this.param = message.data;
                this.type = message.type;

                poll.trigger({ type: "beforeBinding", body: this });

                var promise = $.when(this.onBinding())
                .then(function () {
                    poll.trigger({ type: "afterBinding", body: this });
                } .bind(this))
                .fail(function () {
                    poll.trigger({ type: "errorBinding", body: this });
                } .bind(this));

                return promise;
                break;
            case "main": //Вызывается в первый раз после binding и каждый раз перед show, если контекст модуля был удален
                poll.trigger({ type: "beforeMain", body: this });

                var promise = $.when(this.onBinding(), this.main())
                .then(function () {
                    poll.trigger({ type: "afterMain", body: this });
                } .bind(this))
                .fail(function () {
                    poll.trigger({ type: "errorMain", body: this });
                } .bind(this));

                return promise;
                break;
            case "unbinding": //Вызывается один раз, при уничтожении модуля
                poll.trigger({ type: "beforeUnbinding", body: this });
                var promise = $.when(this.onUnbinding())
                .then(function () {
                    this.context.remove();
                    poll.trigger({ type: "afterUnbinding", body: this });
                } .bind(this))
                .fail(function () {
                    poll.trigger({ type: "errorUnbinding", body: this });
                } .bind(this));

                return promise;
                break;
            case "show": //Вызывается каждый раз, когда модуль становится видим
                if (!this.context) return;
                if (!this.visible) {
                    poll.trigger({ type: "beforeShow", body: this });
                    var promise = $.when(this.onShow())
                    .then(function () {
                        this.visible = true;
                        this.context.show();
                        poll.trigger({ type: "afterShow", body: this });
                    } .bind(this))
                    .fail(function () {
                        poll.trigger({ type: "errorShow", body: this });
                    } .bind(this));

                    return promise;
                }
                break;
            case "hide": //Вызывается каждый раз, когда модуль становится невидим
                if (!this.context) return;
                if (this.visible === true) {
                    poll.trigger({ type: "beforeHide", body: this });
                    var promise = $.when(this.onHide())
                    .then(function () {
                        this.visible = false;
                        this.context.hide();
                        poll.trigger({ type: "afterHide", body: this });
                    } .bind(this))
                    .fail(function () {
                        poll.trigger({ type: "errorHide", body: this });
                    } .bind(this));

                    return promise;
                }
                break;
            case "message": //Прочие сообщения от системы и модулей
                this.onMessage(message);
                break;
            case "resize": //Изменение размеров окна браузера
                if (this.visible) {
                    this.onResize(message);
                }
                break;
        }
    };

    this.message = function (type, mgs) {
        poll.trigger({ type: "msg", header: type, body: mgs });
    };
}

window.Module.prototype = {
    main: function () {

    },

    onBinding: function () {

    },

    onUnbinding: function () {

    },

    onShow: function () {

    },

    onHide: function () {

    },

    onMessage: function (message) {

    },

    onResize: function (message) {

    }
}

window.Manager = function (options) {
    var defOptions = { theme: 'default' };
    options = $.extend({}, options, defOptions);

    var mainContext = $('#mainContext');
    mainContext.append('<ul id="contextContainer"></ul>');
    var contextContainer = mainContext.find('#contextContainer');

    var poll = $('script[id=core]');

    var listOfLibraries = {}; //Коллекция подключенных модулей

    var listOfModules = {}; //Коллекция загруженных модулей

    var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    var generateGUID = function () {
        return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
    };

    var Dependence = function (callback) {
        var chain = [];

        var dfd = $.Deferred();

        var namespace = function () {
            var o, d;
            $.each(arguments, function (k, v) {
                if (typeof v != 'string') return undefined;
                d = v.split(".");
                o = window[d[0]];
                if (o === undefined) return false;
                $.each(d.slice(1), function (k, v2) {
                    if (o[v2]) {
                        o = o[v2];
                    } else {
                        return false;
                    }
                });
            });
            return o;
        };

        this.add = function (files, test) {
            if (!files) return;
            if (arguments.length == 2) {
                chain.push({
                    test: namespace(test),
                    nope: files,
                    callback: function (url, result, key) {
                        if (!namespace(test)) {
                            dfd.reject();
                        }
                    }
                });
            } else {
                chain.push({
                    load: files
                });
            }
        }

        this.load = function () {
            if (chain.length > 0) {
                chain[chain.length - 1].complete = function () {
                    if (!dfd.isRejected()) {
                        dfd.resolve();
                    }
                }
                yepnope(chain);
                return dfd;
            } else {
                return true;
            }
        }
    }

    this.theme = function (themeName) {
        if (arguments.length == 0) {
            return options.theme;
        }
        options.theme = 'themeName';
        poll.trigger({ type: "changeTheme", body: { name: options.theme} });
    }

    poll.bind('msg', function (data) { //точка входа в ядро для модулей
        switch (data.header) {
            case "attach":
                var library = {
                    name: data.body.name,
                    body: data.body.module,
                    dependence: data.body.dependence
                };
                listOfLibraries[library.name] = library; //имя модуля должно быть уникально 

                var body = listOfLibraries[library.name];
                poll.trigger({ type: "beforeAttach", body: body });
                break;
            case "complete":
                listOfModules[data.body.id].status = 'complete';
                break;
            case "message":
                $.each(listOfModules, function (type, mgs) {
                    if (this.status == 'complete') {
                        this.message(type, mgs);
                    }
                });
                break;
            case "instance":
                var jsFile = data.body.library.replace('.', '/');
                yepnope({
                    test: listOfLibraries[data.body.library],
                    nope: 'modules/' + jsFile + '.js',
                    callback: function (url, result, key) {
                        poll.trigger({ type: "afterAttach", body: url });
                    },
                    complete: function () {
                        var promiceForHide = [];
                        $.each(listOfModules, function () {
                            if (this.id != data.body.id && this.status == 'complete' && this.type == 'window') {
                                promiceForHide.push(this.body.entry({ event: "hide" }));
                            }
                        });
                        $.when.apply(this, promiceForHide)
                        .then(function () {
                            var libraryName = data.body.library;
                            if (libraryName.indexOf('.') > -1) {
                                libraryName = libraryName.substring(libraryName.lastIndexOf('.') + 1, libraryName.length);
                            }
                            var lib = listOfLibraries[libraryName];

                            if (!lib) {
                                poll.trigger({ type: "errorAttach", body: libraryName });
                                return;
                            }

                            if (lib.dependence) {
                                poll.trigger({ type: "beforeDependence", body: {} });
                                loader = new Dependence();
                                loader.add(lib.dependence.css);

                                $.each(lib.dependence.js || {}, function (test, js) {
                                    loader.add(js, test);
                                });

                                $.when(loader.load())
                                .then(function () {
                                    poll.trigger({ type: "afterDependence", body: {} });
                                    var module = listOfModules[data.body.id] || {
                                        library: libraryName,
                                        id: data.body.id,
                                        class: data.body.class,
                                        type: data.body.type || 'window'
                                    };

                                    if (lib.body) {
                                        var isNewModule = !module.status;
                                        if (isNewModule) {
                                            listOfModules[module.id] = module;
                                            module.body = new lib.body(); //создание экземпляра библиотеки
                                        }
                                        if (module.body instanceof Module) { //Модуль должен наследовать методы базового класса Lib
                                            var context = contextContainer.find('#' + module.id);
                                            var isNewContext = false;
                                            if (context.length == 0) {
                                                isNewContext = true;
                                                contextContainer.append('<li id="' + module.id + (module.class ? ' class="' + module.class + '"' : '') + '>'); //создание контекста
                                                context = contextContainer.find('#' + module.id);
                                            }
                                            if ('visibility' in data.body) {
                                                var defaultVisibleState = data.body.visibility == 'hide' ? 'hide' : 'show';
                                            } else {
                                                context.removeAttr('visibility');
                                                context.removeAttr('display');
                                                var defaultVisibleState = context.is(':visible') ? 'show' : 'hide';
                                            }
                                        } else {
                                            poll.trigger({ type: "errorAttach", body: module });
                                        }

                                        if (isNewContext) {
                                            $.when((isNewModule ? module.body.entry({ event: "binding", id: module.id, context: context, data: data.body.param || {}, type: module.type }) : {}), module.body.entry({ event: "main" }), module.body.entry({ event: defaultVisibleState }));
                                        } else {
                                            module.body.entry({ event: defaultVisibleState });
                                        }
                                    } else {
                                        poll.trigger({ type: "errorAttach", body: module });
                                    }
                                })
                                .fail(function () {
                                    poll.trigger({ type: "errorDependence", body: {} });
                                });
                            }

                        } .bind(this));
                    }
                });
                break;
        }
    });
}
