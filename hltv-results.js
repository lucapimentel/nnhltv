var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('database/hltv');

module.exports = {
    resultados: function (idTime01, idTime02, callback) {
        //var url = "https://www.hltv.org/results?team=" + idTime01 + "&requireAllTeams=&team=" + idTime02;
        var url = "https://www.hltv.org/results?team=" + idTime01 + "&requireAllTeams=&team=4411";
        request(url, function (err, resp, html) {
            if (!err) {
                var $ = cheerio.load(html);

                var team_01, team_02, result_team_01, result_team_02, tourn, tourn_img;
                var json = { team_01: "", team_02: "", result_team_01: "", result_team_02: "", tourn: "", tourn_img: "" };
                var resp = "";
                $(".results-all").filter(function () {

                    var data = $(this);
                    var result = data.find(".result-con");
                    var dt = [];
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

                        // dt.push({ team_01: team_01, team_01_id: team_01_id, team_02: team_02, team_02_id: team_02_id, result_team_01: result_team_01, result_team_02: result_team_02, tourn: tourn, tourn_img: tourn_img });
                        //console.log({ team_01: team_01, team_01_id: team_01_id, team_02: team_02, team_02_id: team_02_id, result_team_01: result_team_01, result_team_02: result_team_02, tourn: tourn, tourn_img: tourn_img });
                       // console.log(count++);
                        var queryResult = "";
                        if (parseInt(result_team_01) > parseInt(result_team_02)) {
                            queryResult = team_01_id;
                        } else {
                            queryResult = team_02_id;
                        }
                        var query = "insert into rel_jogos (idTime01, idTime02, idTimeVencedor) values (" + team_01_id + ", " + team_02_id + ", " + queryResult + ")";
                        resp = query;
                        db.serialize(function () {
                            db.run(query);
                            // db.on("profile", function (str, time) {
                            //     console.log(str);
                            // });
                        });
                    });
                });

            }
        });
    }
}