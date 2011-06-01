Function.prototype.extend = function (superClass) { //inheritance
    var Inheritance = function () { };
    Inheritance.prototype = superClass.prototype;

    this.prototype = new Inheritance();
    this.prototype.constructor = this;
    this.superClass = superClass;
}

window.Module = function () { //abstract class
    var window; //hide the global object
    var document; //hide the global object
    var self = this;
    var poll = $('script[id=core]'); //cache

    this.context; //dom`s context of the module 

    this.id; //unique inner module`s name (crc32 from this.param + library name)

    this.param; //arguments from an outer space

    this.entry = function (message) { //the entry point in a module
        switch (message.event) {
            case "binding": //called one time after executing a module
                this.id = message.id;
                this.context = message.context;
                this.param = message.data;
                this.type = message.type;

                poll.trigger({ type: "request", header: "complete", body: self });

                poll.trigger({ type: "message", header: "beforeBinding", body: self });

                var dfd = $.when(this.onBinding())
                .then(function () {
                    poll.trigger({ type: "message", header: "afterBinding", body: self });
                })
                .fail(function () {
                    poll.trigger({ type: "message", header: "errorBinding", body: self });
                });

                return dfd.promise();
                break;
            case "main": //called in the first time after binding a module, and if the module`s context was remoded on shows
                poll.trigger({ type: "message", header: "beforeMain", body: self });

                var dfd = $.when(this.onBinding(), this.main())
                .then(function () {
                    poll.trigger({ type: "message", header: "afterMain", body: self });
                })
                .fail(function () {
                    poll.trigger({ type: "message", header: "errorMain", body: self });
                });

                return dfd.promise();
                break;
            case "unbinding":
                poll.trigger({ type: "message", header: "beforeUnbinding", body: self });
                var dfd = $.when(this.onUnbinding())
                .then(function () {
                    self.context.remove();
                    poll.trigger({ type: "message", header: "afterUnbinding", body: self });
                })
                .fail(function () {
                    poll.trigger({ type: "message", header: "errorUnbinding", body: self });
                });

                return dfd.promise();
                break;
            case "show":
                if (!this.context) return;
                if (!this.visible) {
                    poll.trigger({ type: "message", header: "beforeShow", body: self });
                    var dfd = $.when(this.onShow())
                    .then(function () {
                        self.visible = true;
                        self.context.show();
                        poll.trigger({ type: "message", header: "afterShow", body: self });
                    })
                    .fail(function () {
                        poll.trigger({ type: "message", header: "errorShow", body: self });
                    });

                    return dfd.promise();
                }
                break;
            case "hide":
                if (!this.context) return;
                if (this.visible === true) {
                    poll.trigger({ type: "message", header: "beforeHide", body: self });
                    var dfd = $.when(this.onHide())
                    .then(function () {
                        self.visible = false;
                        self.context.hide();
                        poll.trigger({ type: "message", header: "afterHide", body: self });
                    })
                    .fail(function () {
                        if (confirm('Данные не сохранены' + "\nВыйти без изменений?")) {
                            self.rollback();
                            message.retry();
                        }
                        poll.trigger({ type: "message", header: "errorHide", body: self });
                    });

                    return dfd.promise();
                }
                break;
            case "message":
                this.onMessage(message);
                break;
            case "resize":
                if (this.visible) {
                    this.onResize(message);
                }
                break;
        }
    };

    this.message = function (type, mgs) {
        poll.trigger({ type: "request", header: type, body: mgs });
    };
}

window.Module.prototype = {
    main: function () {

    },

    save: function () {

    },

    rollback: function () {

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

    var defOptions = {
        theme: 'default'
    };
    options = $.extend({}, options, defOptions);

    var loader, mainContex, contextContainert, poll, listOfLibraries, listOfModules;

    var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    var generateGUID = function () {
        return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
    };

    var Dependence = function () {
        var chain = [];
        var dfd;

        var isExists = function () {
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
                    test: isExists(test),
                    nope: files,
                    callback: function (url, result, key) {
                        if (!isExists(test)) {
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
            dfd = $.Deferred();
            dfd.always(function () {
                chain = [];
            });

            if (chain.length > 0) {
                chain[chain.length - 1].complete = function () {
                    if (!dfd.isRejected()) {
                        dfd.resolve();
                    }
                }
                yepnope(chain);
                return dfd.promise();
            } else {
                return false;
            }
        }
    }

    this.theme = function (themeName) {
        if (arguments.length == 0) {
            return options.theme;
        }
        options.theme = 'themeName';
        poll.trigger({ type: "message", header: "changeTheme", body: { name: options.theme} });
    }

    var instant = function (body) {
        body.type = body.type || 'window';

        var promiceForHide = [];
        if (body.type == 'window') {
            $.each(listOfModules, function () {
                if (this.id != body.id && this.status == 'complete' && this.type == 'window') {
                    promiceForHide.push(this.body.entry({ event: "hide", retry: function () { instant(body) } }));
                }
            });
        }
        $.when.apply(this, promiceForHide)
        .then(function () {
            var lib = listOfLibraries[body.libraryName];

            if (lib.dependence) {
                poll.trigger({ type: "message", header: "beforeDependence", body: {} });

                loader.add(lib.dependence.css);

                $.each(lib.dependence.js || {}, function (test, js) {
                    loader.add(js, test);
                });
            }

            $.when(loader.load())
            .then(function (result) {
                if (result !== false) {
                    poll.trigger({ type: "message", header: "afterDependence", body: {} });
                }
                var module = listOfModules[body.id] || {
                    library: body.libraryName,
                    id: body.id,
                    class: body.class,
                    type: body.type
                };

                if (lib.body) {
                    var isNewModule = !module.status;
                    if (isNewModule) {
                        listOfModules[module.id] = module;
                        module.body = new lib.body();
                    }
                    if (module.body instanceof Module) {
                        var context = contextContainer.find('#' + module.id);
                        var isNewContext = false;
                        if (context.length == 0) {
                            isNewContext = true;
                            contextContainer.append('<li id="' + module.id + '"' + (module.class ? ' class="' + module.class + '"' : '') + '>'); //создание контекста
                            context = contextContainer.find('#' + module.id);
                        }
                        var defaultVisibleState = body.visibility == 'hide' ? 'hide' : 'show'
                    } else {
                        poll.trigger({ type: "message", header: "errorAttach", body: module });
                        return false;
                    }

                    if (isNewContext) {
                        $.when((isNewModule ? module.body.entry({ event: "binding", id: module.id, context: context, data: body.param || {}, type: module.type }) : {}), module.body.entry({ event: "main" }), module.body.entry({ event: defaultVisibleState }));
                    } else {
                        module.body.entry({ event: defaultVisibleState });
                    }
                } else {
                    poll.trigger({ type: "message", header: "errorAttach", body: module });
                    return false;
                }
            });
        });
    }

    this.run = function () {
        poll = $('script[id=' + options.coreId + ']');

        poll.trigger({ type: "message", header: "beforeRun", body: {} });

        mainContext = $('#' + options.mainContextId);
        mainContext.append('<ul id="' + options.contextContainerId + '"></ul>');

        contextContainer = mainContext.find('#' + options.contextContainerId);

        listOfLibraries = {};

        listOfModules = {};

        loader = new Dependence();

        poll.bind('request', function (data) {
            switch (data.header) {
                case "attach":
                    var library = {
                        name: data.body.name,
                        body: data.body.module,
                        dependence: data.body.dependence
                    };
                    listOfLibraries[library.name] = library;

                    poll.trigger({ type: "message", header: "beforeAttach", body: listOfLibraries[library.name] });
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
                    var libraryName = data.body.library;
                    if (libraryName.indexOf('.') > -1) {
                        libraryName = libraryName.substring(libraryName.lastIndexOf('.') + 1, libraryName.length);
                    }
                    yepnope({
                        test: listOfLibraries[libraryName],
                        nope: 'modules/' + jsFile + '.js',
                        complete: function () {
                            if (listOfLibraries[libraryName]) {
                                poll.trigger({ type: "message", header: "afterAttach", body: listOfLibraries[libraryName] });
                                instant({ libraryName: libraryName, id: data.body.id, class: data.body.class, type: data.body.type, visibility: data.body.visibility, param: data.body.param });
                            } else {
                                poll.trigger({ type: "message", header: "errorAttach", body: { name: libraryName} });
                            }
                        }
                    });
                    break;
            }
        });

        if (options.dependence) {
            loader.add(options.dependence.css);

            if ($.isArray(options.dependence.js)) {
                loader.add(options.dependence.js);
            } else if ($.isPlainObject(options.dependence.js)) {
                $.each(options.dependence.js || {}, function (test, js) {
                    loader.add(js, test);
                });
            }
        }

        if (poll.length == 0 || mainContext.length == 0 || contextContainer.length == 0) {
            var dfd = $.Deferred();
            dfd.reject();
        } else {
            var dfd = loader.load();
        }
        dfd.done(function () {
            poll.trigger({ type: "message", header: "afterRun", body: {} });
        });

        return dfd.promise();
    }
}