var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();
var hltvResults = require('./hltv-results.js');
var hltvTeams = require('./hltv-team-id');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('database/hltv');
var async = require('async');
var mlp = require('mlp');
var http = require('https');
var bodyParser = require('body-parser');

var csgoMLP = new mlp(7, 2);
var learnRate = 0.5;
var error = Number.MAX_VALUE;
csgoMLP.addHiddenLayer(25);

var urlencodedParser = bodyParser.urlencoded({ extended: true })


app.get('/mlp', function (req, res) {
    csgoMLP.init();

    db.all("SELECT * FROM vw_treinamento", function (err, allRows) {
        res.json(allRows);

        for (var index = 0; index < allRows.length; index++) {
            csgoMLP.addToTrainingSet([allRows[index].percVitTotalT1, allRows[index].KDAT1, allRows[index].percVitTotalT2, allRows[index].KDAT2, allRows[index].PorcT1emCimaT2, allRows[index].porcMapa01, allRows[index].porcMapa02], [allRows[index].vitoriaT1, allRows[index].vitoriaT2]);
            var query = "INSERT INTO dadoTreinamento values (" + allRows[index].idRJ + ")";
            //console.log(query);
            db.run(query, function (err) {
                console.log("Finish");
                res.status(200);
                res.end();
            });
        }
    });



});

app.get("/train", function (req, res) {
    var learnRate = 0.5;
    var error = Number.MAX_VALUE;
    while (error > 22) {
        error = csgoMLP.train(learnRate);
        console.log(error);
    }
});

app.get("/clear", function (req, res) {
    csgoMLP.clearTrainingSet();
    csgoMLP.resetWeights();

    var query = "DELETE FROM dadoTreinamento";
    //console.log(query);
    db.run(query, function (err) {
        console.log("End clear");
        res.status(200);
        res.end();
    });
});

app.get("/exportWeights", function (req, res) {
    res.json(csgoMLP.exportToJson());
});

app.post("/importWeights", urlencodedParser, function (req, res) {
    var jsonWeights = req.body;
    res.json(jsonWeights);
    console.log(req);
    //csgoMLP.setWeights(jsonWeights);
})

app.get("/teste", function (req, res) {
    var elementToClassify = [0.667271078875793, 1.0, 0.667924528301887, 1.0, 0.4, 0.6, 0.726];
    var classification = csgoMLP.classify(elementToClassify);
    res.json(classification);
    console.log(classification);
})

app.get('/scrape', function (req, res) {

    db.all('select id from times where id != 4991 order by id', function (err, allRows) {
        async.each(allRows, function (allRows, callback) {
            var url = "https://www.hltv.org/results?team=" + allRows.id + "&requireAllTeams=&team=4991";

            getData(url, function () {
                callback();
            })
        }, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("Fim de processo");
                //  process.exit(0);
            }
        });
    });
})

function getData(url, callback) {
    request(url, function (err, resp, html) {
        if (!err) {
            var $ = cheerio.load(html);
            var dt = [];
            var team_01, team_02, result_team_01, result_team_02, tourn, tourn_img;
            var json = { team_01: "", team_02: "", result_team_01: "", result_team_02: "", tourn: "", tourn_img: "" };
            var resp = "";
            var querys = [];
            $(".results-all").filter(function () {

                var data = $(this);
                var result = data.find(".result-con");
                var count = 0;

                result.each(function () {
                    team_01 = $(this).find(".team-cell").first().children().children().text();
                    team_02 = $(this).find(".team-cell").next().next().first().children().children().text();
                    var team_01_id = $(this).find(".team-cell").first().find(".team-logo").attr("src").toString().split("/")[6];
                    var team_02_id = $(this).find(".team-cell").next().next().first().find(".team-logo").attr("src").toString().split("/")[6];
                    result_team_01 = $(this).find(".team-cell").next().first().find("span").first().text();
                    result_team_02 = $(this).find(".team-cell").next().first().find("span").next().text();
                    tourn = $(this).find(".team-cell").next().next().next().first().find(".event-name").text();
                    tourn_img = $(this).find(".team-cell").next().next().next().first().find("img").attr("src");
                    var mapa = $(this).find(".star-cell").find(".map-text").text();
                    var link = $(this).find(".a-reset").attr("href");
                    var queryResult = "";
                    // console.log(mapa.indexOf("bo3") >= 0);
                    if (mapa.indexOf("bo3") >= 0 || mapa.indexOf("bo2") >= 0 || mapa.indexOf("bo5") >= 0) {
                        if (parseInt(result_team_01) > parseInt(result_team_02)) {
                            queryResult = team_01_id;
                        } else {
                            queryResult = team_02_id;
                        }
                        // var query = "insert into rel_jogos (idTime01, idTime02, idTimeVencedor) values (" + team_01_id + ", " + team_02_id + ", " + queryResult + ")";
                        var query = "update rel_jogos set mapa = '?' where idTime01 = " + team_01_id + " and idTime02 = " + team_02_id + " and  idTimeVencedor = " + queryResult;
                        var urlBo3 = "https://www.hltv.org" + link;
                        // db.run(query);

                        getMapBo3Name(urlBo3, query);
                    } else {
                        if (parseInt(result_team_01) > parseInt(result_team_02)) {
                            queryResult = team_01_id;
                        } else {
                            queryResult = team_02_id;
                        }
                        // var query = "insert into rel_jogos (idTime01, idTime02, idTimeVencedor) values (" + team_01_id + ", " + team_02_id + ", " + queryResult + ")";
                        var query = "update rel_jogos set mapa = " + "'" + mapa + "'" + " where idTime01 = " + team_01_id + " and idTime02 = " + team_02_id + " and  idTimeVencedor = " + queryResult;
                        // console.log(query);
                        //console.log(mapa);
                        db.run(query);
                    }

                });
            });
        }
        callback();
    });
}

function getMapBo3Name(url, query) {
    console.log(url);
    http.get(url, function (response) {
        var html = "";
        response.on('data', function (chunk) {
            html += chunk;
        });

        response.on('end', function () {
            console.log(html);
            var $ = cheerio.load(html);
            var mapName = "";
            $(".match-page").filter(function () {
                mapName = $(this).find(".map-name-holder").first().find(".mapname").text();
                console.log(mapName);
                db.run(query.toString().replace("?", mapName));
            });
        })
    });
}

app.get('/teamid', function (req, res) {
    var maps = [{ mapName: "overpass", mapId: "40" }, { mapName: "cobble", mapId: "39" }, { mapName: "inferno", mapId: "33" }, { mapName: "train", mapId: "35" }, { mapName: "cache", mapId: "29" }, { mapName: "mirage", mapId: "32" }, { mapName: "nuke", mapId: "34" }, { mapName: "dust2", mapId: "31" }];
    for (var index = 0; index < maps.length; index++) {
        hltvTeams.teamid(maps[index].mapId, "7613", "red-reserve", function (err, resp) {

        });
    }
})

app.get('/teamdata', function (req, res) {
    db.all('SELECT id, Nome FROM times ', function (err, allRows) {
        for (var index = 0; index < allRows.length; index++) {
            hltvTeams.teamParameters(allRows[index].id, allRows[index].Nome, function (err, resp) {
                process.exit(0);
            });
        }
    });

})

app.listen('3000');

console.log('Magic happens on port 3000');

exports = module.exports = app;