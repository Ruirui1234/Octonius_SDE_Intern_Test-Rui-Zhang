var http = require('http');
var fs = require('fs');
var template = require('art-template');
var url = require('url');


var server = http.createServer();
var listOfTodo = [];
var listOfDone = [];

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://zhangrui:987654321@cluster0-i4pqu.mongodb.net/test?retryWrites=true";


var postToDb = function(db, listName, data, callback) {  
    var collection = db.db("project_todolist").collection(listName);
    collection.insertOne(data, function(err, result) { 
        if(err)
        {
            console.log('Error:'+ err);
            return;
        }     
        callback(result);
    });
}
var getFromDb = function (db, listName, whereStr, callback) {
    var collection = db.db("project_todolist").collection(listName);
    collection.find(whereStr).toArray(function (err, result) {
        if (err) {
            console.log('Error:' + err);
            return;
        }
        callback(result);
    });
}
var deleteFromDb = function (db, listName, createdtime, callback) {
    var collection = db.db("project_todolist").collection(listName);
    var whereStr = {
        "createdtime": createdtime
    };
    collection.deleteOne(whereStr, function (err, result) {
        if (err) {
            console.log('Error:' + err);
            return;
        }
        callback(result);
    });
}


Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "H+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}


server.on('request', function (req, res) {
    console.log('request: ' + req.url);
    var parseObj = url.parse(req.url, true);
    var pathname = parseObj.pathname;

    if (pathname === '/' || pathname === '/index' || pathname === '/index.html') {
        MongoClient.connect(uri, {useNewUrlParser: true}, function (err, db) {
            getFromDb(db, "project_todolist", {}, function (result) {
                console.log(result);
                listOfTodo = result;
                getFromDb(db, "project_donelist", {}, function (result) {
                    listOfDone = result;
                    fs.readFile('./public/html/index.html', function (err, data) {
                        if (err) {
                            res.end('index.html 404');
                            return;
                        }
                        var content = template.render(data.toString(), {
                            title: 'Home',
                            listOfTodo: listOfTodo,
                            listOfDone: listOfDone
                        })
                        res.end(content);
                    });
                });
            });
        });
    } else if (pathname === '/post') {
        fs.readFile('./public/html/post.html', function (err, data) {
            if (err) {
                res.end('404' + req.url);
                return;
            }
            res.end(data);
        });
    } else if (pathname == '/newpost') {
        var mission = parseObj.query;
        mission.createdtime = new Date().Format("yyyy-MM-dd HH:mm:ss");
        mission.finishtime = "";
        console.log('new mission created: ' + JSON.stringify(mission));
        MongoClient.connect(uri, {useNewUrlParser: true}, function (err, db) {
            postToDb(db, "project_todolist", mission, function (result) {
                console.log(result);
                db.close();
                res.statusCode = 302;
                res.setHeader('Location', '/');
                res.end();
            });
        });
    } else if (pathname == '/finish') {
        var createdtime = parseObj.query.createdtime;
        MongoClient.connect(uri, {useNewUrlParser: true}, function (err, db) {
            getFromDb(db, "project_todolist", {"createdtime" : createdtime}, function (result) {
                console.log(result);
                var mission = result[0];
                mission.finishtime = new Date().Format("yyyy-MM-dd HH:mm:s");
                postToDb(db, "project_donelist", mission, function (result) {
                    db.close();
                });
                deleteFromDb(db, "project_todolist", createdtime, function (result) {
                    db.close();
                    res.statusCode = 302;
                    res.setHeader('Location', '/');
                    res.end();
                });
            }); 
        });
        

    } else if (pathname == '/deletetodo') {
        var createdtime = parseObj.query.createdtime;
        console.log('ongoing mission deleted: ' + JSON.stringify(createdtime));
        MongoClient.connect(uri, {useNewUrlParser: true}, function (err, db) {
            deleteFromDb(db, "project_todolist", createdtime, function (result) {
                console.log(result);
                db.close();
                res.statusCode = 302;
                res.setHeader('Location', '/');
                res.end();
            });
        });
    } else if (pathname == '/deletedone') {
        var createdtime = parseObj.query.createdtime;
        console.log('ongoing mission deleted: ' + JSON.stringify(createdtime));
        MongoClient.connect(uri, {useNewUrlParser: true}, function (err, db) {
            deleteFromDb(db, "project_donelist", createdtime, function (result) {
                console.log(result);
                db.close();
                res.statusCode = 302;
                res.setHeader('Location', '/');
                res.end();
            });
        });

    } else if (pathname.indexOf('/public/') === 0) {
        fs.readFile('.' + pathname, function (err, data) {
            if (err) {
                res.end('404' + pathname);
                return;
            }
            res.end(data);
        });
    } else {
        fs.readFile('./public/html/404.html', function (err, data) {
            if (err) {
                res.end('404' + req.url);
                return;
            }
            res.end(data);
        });
    }



})



server.listen(8081, function () {
    console.log('Server is running...');
})