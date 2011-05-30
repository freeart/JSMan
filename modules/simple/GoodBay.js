!function () { //namespace модуля

    var Lib = function () {
        var self = this;
        Lib.superClass.apply(this); //Вызываем родительский конструктор

        var answer2;

        this.main = function () { //Точка входа в библиотеку
            this.context.html('Hello World with param: "' + this.param + '"');
            var store = $.get('core/modules.txt');
            return store;
        }

        this.onHide = function () {
            if (this.param == "2") {
                var dfd = $.Deferred();
                if (!answer2) {
                    answer2 = true;
                    dfd.reject();
                } else {
                    dfd.resolve();
                }
                return dfd;
            }
        }
    }
    Lib.extend(window.Module); //Наследуемся от абстрактного класса, реализующего рутину

    $("script[id=core]").trigger({  //делаем запрос на подключение нашей библиотеки
        type: "msg",                //к ядру системы
        header: "attach", //Тип сообщения
        body: {
            module: Lib, //Тело библиотеки
            name: "Hello" //Уникальное имя библиотеки
        }
    });

} ();
