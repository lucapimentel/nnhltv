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


app.get('/mlp', function (req, res) {
    var csgoMLP = new mlp(7,2);
    //res.json(csgoMLP);
    csgoMLP.addHiddenLayer(25);
    //pegar todas as entradas e saidas esperadas no banco de dados
    

    res.json(csgoMLP);
});

app.get('/scrape', function (req, res) {

    db.all('select id from times where id != 7613 order by id', function (err, allRows) {
        async.each(allRows, function (allRows, callback) {

            var url = "https://www.hltv.org/results?team=" + allRows.id + "&requireAllTeams=&team=7613";

            getData(url, function () {
                callback();
            })
        }, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("Fim de processo");
               process.exit(0);
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

                    json.team_01 = team_01;
                    json.team_02 = team_02;
                    json.result_team_01 = result_team_01;
                    json.result_team_02 = result_team_02;
                    json.tourn = tourn;
                    json.tourn_img = tourn_img;

                    var queryResult = "";
                    if (parseInt(result_team_01) > parseInt(result_team_02)) {
                        queryResult = team_01_id;
                    } else {
                        queryResult = team_02_id;
                    }
                    var query = "insert into rel_jogos (idTime01, idTime02, idTimeVencedor) values (" + team_01_id + ", " + team_02_id + ", " + queryResult + ")";
                    resp = query;
                  
                     db.run(query);
                });
            });
        }
        callback();
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