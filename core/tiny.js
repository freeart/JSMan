//#region extend
Function.prototype.extend = function (superClass) { //inheritance
    var Inheritance = function () { };
    Inheritance.prototype = superClass.prototype;

    this.prototype = new Inheritance();
    this.prototype.constructor = this;
    this.superClass = superClass;
}
//#endregion

//#region Module
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
                        if (confirm("Data not saved, continue?")) {
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
//#endregion

//#region Manager
window.App = function (options) {

    var listOfLibraries, listOfModules;

    var defOptions = {};

    var options = this.options = $.extend({}, options, defOptions);
    var poll = this.poll = $('script[id=' + options.id + ']');
    var target = $('#' + options.target);

    var instant = function (body) {
        var dfd = $.Deferred();
        if (body.manager == 'container') {
            var promiceForHide = [];
            $.each(listOfModules, function () {
                if (this.id != body.id && this.status == 'complete' && this.manager == body.manager) {
                    promiceForHide.push(this.body.entry({ event: "hide", retry: function () { instant(body); } }));
                }
            });
            $.when.apply(this, promiceForHide).then(function () {
                var modulesContainer = target.find('#' + body.manager);
                if (modulesContainer.length == 0) {
                    target.append('<ul id="' + body.manager + '"></ul>');
                }
                modulesContainer = target.find('#' + body.manager);

                var context = modulesContainer.find('#' + body.id);
                if (context.length == 0) {
                    modulesContainer.append('<li id="' + body.id + '"' + (body.class ? ' class="' + body.class + '"' : '') + '>');
                }
                context = modulesContainer.find('#' + body.id);

                dfd.resolve(context);
            })
        } else if (body.manager == 'single') {
            var context = target.find('#' + body.manager);
            if (context.length == 0) {
                target.append('<div id="' + body.id + '"' + (body.class ? ' class="' + body.class + '"' : '') + '></div>');
            }
            context = target.find('#' + body.manager);

            dfd.resolve(context);
        }

        dfd.done(function (context) {
            var lib = listOfLibraries[body.libraryName];

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
                        contextContainer.append('<li id="' + module.id + '"' + (module.class ? ' class="' + module.class + '"' : '') + '>');
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
    }

    this.run = function () {
        var dfd = $.Deferred();

        poll.trigger({ type: "message", header: "beforeRun", body: {} });

        listOfLibraries = {};

        listOfModules = {};

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

        if (poll.length == 0 || target.length == 0) {
            dfd.reject();
        } else {
            dfd.resolve()
        }
        dfd.done(function () {
            poll.trigger({ type: "message", header: "afterRun", body: {} });
        });

        return dfd.promise();
    }
}
//#endregion