var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('database/hltv');
var async = require('async');




module.exports = {
    teamid: function (mapId, teamId, teamName, callback) {
        var url = "https://www.hltv.org/stats/teams/map/" + mapId + "/" + teamId + "/" + teamName;
        request(url, function (err, resp, html) {
            if (!err) {
                var $ = cheerio.load(html);
                var dt = [];
                $(".contentCol").filter(function () {

                    var data = $(this);
                    var result = data.find(".columns").find(".stats-rows.standard-box").children().next().next().next().next().children().first().next().text();
                    var mapName = data.find(".stats-top-menu-item.selected").find(".stats-top-menu-item-link").text()
                    console.log({ mapName: mapName, porcent: parseFloat(result) });
                    var query = "update times set " + mapName + " = ? where id = 7613";
                    db.run(query, parseFloat(result) / 100, function (err, row) {
                        if (err) {
                            console.log(err);

                        }

                    });
                    dt.push({ mapName: mapName, porcent: result });
                });
            }
            callback(dt);
        });

    },

    teamParameters: function (teamId, teamName, callback) {
        var url = "https://www.hltv.org/stats/teams/" + teamId + "/" + teamName;
        request(url, function (err, resp, html) {
            if (!err) {
                var $ = cheerio.load(html);
                var dt = [];
                $(".contentCol").filter(function () {

                    var data = $(this);
                    var result = data.find(".columns").children().first().next().find(".large-strong").text();
                    var KD = data.find(".vspace").next().children().first().next().next().find(".large-strong").text();
                    var vitorias = parseInt(result.toString().split("/")[0]);
                    var derrotas = parseInt(result.toString().split("/")[2]);

                    var mapasJogados = vitorias + derrotas;
                    var percVitoria = vitorias / mapasJogados;

                    var normKD = (parseFloat(KD) - 0.97) / (1.12 - 0.97);

                    var query = "update times set percVitoria_total = " + parseFloat(percVitoria) + ", numVitoria_total = " + vitorias + ", KDA = " + normKD + " where id = "+ teamId;
                    db.run(query);
                    console.log({ vitorias: vitorias, mapas: mapasJogados });

                });
            }

        });
    }
}
