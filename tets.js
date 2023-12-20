//==UserScript==
// @name            DB-Info
// @version         1.2
// @description     Displays DB information if availible
// @author          mkich, suilenroc, SxR
// @include      https://*.die-staemme.de/game.php?*screen=info_village*
// @include      https://*.die-staemme.de/game.php?*screen=overview_villages*
// @include      https://*.die-staemme.de/game.php?*screen=overview*
// @include      https://*.die-staemme.de/game.php?*screen=settings*
// ==/UserScript==
 
//-----------------------------------
// Code
 
// ==/UserScript==
(function() {
    let win = typeof unsafeWindow != 'undefined' ? unsafeWindow : window
    if (!win.premium) {
        UI.ErrorMessage("DB-Info kann nur mit aktiven Premium account benutzt werden", 3000)
        return
    }
 
    init()
 
    function init() {
        'use strict'
        win.ScriptAPI.register('DB-Info', true, 'mkich, suilenroc, SxR', 'support-nur-im-forum@die-staemme.de')
        try {
            initDBInfo()
            let screen = win.game_data.screen
            let mode = win.game_data.mode
            switch (screen) {
                case "overview":
                    if (win.showVillageOverviewWideget && DBInfo.checkConfig()) {
                        const coords = $('.box #menu_row2')[0].innerText.split("(")[1].split(")")[0].split("|")
                        DBInfo.showDatabaseDetails(coords[0], coords[1], DBInfo.openWidget, null)
                    }
                    break
                case "overview_villages":
                    if (win.showButtonOnAttackScreen && DBInfo.checkConfig()) {
                        if ((mode === "incomings" || $("#show_units").length) && 
$("#paged_view_content > table.vis.modemenu > tbody > tr > td.selected")[1].innerText === 'Angriffe') {
                            DBInfo.openAttackDetail()
                        }
                    }
                    break
                case "info_village":
                    if (win.showVillageDetails && DBInfo.checkConfig()) {
                        const coords = $('.vis')[0].children[0].children[2].children[1].innerText.split('|')
                        if (!win.autoLoadVillageDetails) {
                            const table = $('.vis')[1].children[0]
                            table.insertAdjacentHTML('beforeend', `
                            <tr>
                                <td colspan="2">
                                    <a onClick="$('tr:last-child', $('.vis')[1]).remove(); DBInfo.showDatabaseDetails('${coords[0]}', '${coords[1]}', DBInfo.open, null)">
                                        Datenbankdetails anzeigen
                                    </a>
                                </td>
                            </tr>
                            `)
                        } else {
                            DBInfo.showDatabaseDetails(coords[0], coords[1], DBInfo.open, null)
                        }
                    }
                    break
                case "settings":
                    if ($('table.modemenu td.selected a').length > 0) {
                        if ($('table.modemenu td.selected a').attr('href').includes('mode=settings')) {
                            const settingsElm = $('#content_value tr>td:last-child h3')[0]
                            settingsElm.insertAdjacentHTML('afterend', `
                            <div>
                                <button class='btn' onclick='DBInfo.showConfigurationDialog()'>
                                    Datenbank Settings
                                </button>
                            </div>
                            `)
                        }
                    }
                    break
                default:
            }
        } catch (e) {
            //check if user is logged in and variables are set
            if (typeof game_data.units != 'undefined') {
                UI.ErrorMessage("UserScript DB-Info hatte einen Fehler", 3000)
                console.log(e)
            }
        }
    }
 
    function initDBInfo() {
        DBInfo = {
            serverConf: null,
            mode: null,
            key: null,
            supported_units: ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "snob"],
 
            init() {
                this.mode = win.localStorage.getItem('dbMode')
                this.key = win.localStorage.getItem('dbkey')
            },
            checkConfig() {
                let enabled = win.localStorage.getItem('dbinfoenabled')
                if (enabled == null || enabled == "" || enabled == "true") {
                    enabled = true
                } else {
                    return false
                }
                this.mode = win.localStorage.getItem('dbMode')
                this.key = win.localStorage.getItem('dbkey')
                if ((!this.mode || !this.key) && enabled) {
                    DBInfo.showConfigurationDialog()
                    return false
                } else {
                    return true
                }
            },
            showConfigurationDialog() {
                var popupBox = `
                <div class="popup_box_container" id="dbInfo_popup_box">
                    <div class='popup_box show'>
                        <a class='popup_box_close tooltip-delayed' href='#' onclick='$(\"#dbInfo_popup_box\").remove()'>&nbsp</a>
                        <div class='popup_box_content'><div class='center'>
                            <h2>Datenbank Settings</h2>
                            <table class='vis' width='100%' style='vertical-align:middle'>
                                <tr>
                                    <td>Modus: </td>
                                    <td><select name='dbmode' id='dbmode'>
                                        <option value='USER'${this.mode === "USER"?" selected='selected'":""}>User</option>
                                        <option value='SF'${this.mode === "SF"?" selected='selected'":""}>SF</option>
                                    </select></td>
                                </tr>
                                <tr>
                                    <td>API-Schl\u00FCssel:</td><td><input id='dbapikey' type='text' value="${(this.key == null || this.key == "")?"":"****************"}"></td>
                                </tr>
                                <tr>
                                    <td><button class='btn' onclick='DBInfo.disableOnThisWorld()'>
                                        F\u00FCr diese Welt deaktivieren
                                    </button></td>
                                    <td><button class='btn' onclick='DBInfo.saveConfigurationDialog()'>Speichern</button></td>
                                </tr>
                            </table>
                        </div></div>
                    </div>
                    <div class='fader'></div>
                </div>
                `
                $('#ds_body')[0].insertAdjacentHTML('beforeend', popupBox)
            },
            saveConfigurationDialog() {
                this.mode = $('#dbmode')[0].value
                if($('#dbapikey')[0].value !== "****************") {
                    this.key = $('#dbapikey')[0].value
                }
                if (!this.key) {
                    UI.ErrorMessage("Bitte API-Schl\u00FCssel eingeben.", 3000)
                    return
                }
                localStorage.setItem('dbMode', this.mode)
                localStorage.setItem('dbkey', this.key)
                localStorage.setItem('dbinfoenabled', 'true')
                $('#dbInfo_popup_box').remove()
            },
            disableOnThisWorld() {
                win.localStorage.setItem('dbinfoenabled', 'false')
                $('#dbInfo_popup_box').remove()
            },
            compareSos(a, b) {
                return a.fighttime - b.fighttime
            },
            timeConverter(UNIX_timestamp) {
                if (UNIX_timestamp == 0) {
                    return "Keine Daten"
                }
                var a = new Date(UNIX_timestamp * 1000)
                var year = a.getFullYear()
                var month = a.getMonth()+1 < 10 ? '0' + a.getMonth()+1 : a.getMonth()+1
                var date = a.getDate() < 10 ? '0' + a.getDate() : a.getDate()
                var hour = a.getHours() < 10 ? '0' + a.getHours() : a.getHours()
                var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes()
                var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds()
                var time = date + '.' + month + '.' + year + ' ' + hour + ':' + min + ':' + sec
                return time
            },
            getFormatedTimeLeftToUnixTimestamp(UNIX_timestamp) {
                var date1 = new Date(UNIX_timestamp * 1000)
                date1.setMilliseconds(date1.getMilliseconds() + 300)
                var date2 = new Date(Timing.getCurrentServerTime())
                var diff = date1 - date2
                var hours = Math.floor(diff / (1000 * 60 * 60))
                diff -= hours * (1000 * 60 * 60)
 
                var mins = Math.floor(diff / (1000 * 60))
                diff -= mins * (1000 * 60)
                if (mins < 10) {
                    mins = "0" + mins
                }
 
                var seconds = Math.floor(diff / (1000))
                if (seconds < 10) {
                    seconds = "0" + seconds
                }
 
                return hours + ":" + mins + ":" + seconds
            },
            showDatabaseDetails(x, y, callback, additionals) {
                var formData = new FormData()
                formData.append("Key", localStorage.getItem('dbkey'))
                formData.append("X", x)
                formData.append("Y", y)
                var request = new XMLHttpRequest()
                var url = localStorage.getItem('dbMode') === "SF" ? win.serverConfig.sfAPI : win.serverConfig.userAPI
                request.open("POST", url)
                request.onreadystatechange = function() {
                    if (this.readyState === XMLHttpRequest.DONE) {
                        if (this.status === 200) {
                            if (this.responseText) {
                                callback(JSON.parse(this.responseText), x, y, additionals)
                            } else {
                                UI.ErrorMessage("UserScript DB-Info hatte einen Fehler", 5000)
                                console.log("empty response", this)
                            }
                        } else if (this.status === 403) {
                            UI.ErrorMessage("Datenbankverbindung fehlgeschlagen. Bitte richtigen Key oder Modus einstellen.", 5000)
                        } else {
                            UI.ErrorMessage("Datenbankverbindung ist nicht verf\u00FCgbar.", 5000)
                        }
                    }
                }
                request.send(formData)
            },
            dsCDNUnit(unit) {
                return `https://dsde.innogamescdn.com/graphic/unit/unit_${unit}.png`
            },
            escapeHTML(s) {
                var MAP = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&#34;',
                    "'": '&#39;'
                };
                var repl = function(c) { return MAP[c]; };
                // the "" + s should ensure that we are working with a string
                return ("" + s).replace(/[&<>'"]/g, repl);
            },
            unitNameToSaveImg(unitName) {
                if (unitName == "Ramme") return `<img src='${DBInfo.dsCDNUnit("ram")}'>`
                if (unitName == "Kata") return `<img src='${DBInfo.dsCDNUnit("catapult")}'>`
                if (unitName == "spy" || unitName == "Sp\u00E4her" || unitName == "Sp\u00E4h") return `<img src='${DBInfo.dsCDNUnit("spy")}'>`
                if (unitName == "Axt") return `<img src='${DBInfo.dsCDNUnit("axe")}'>`
                if (unitName == "Speer") return `<img src='${DBInfo.dsCDNUnit("spear")}'>`
                if (unitName == "Schwert") return `<img src='${DBInfo.dsCDNUnit("sword")}'>`
			    if (unitName == "AG" || unitName == "snob") return `<img src='${DBInfo.dsCDNUnit("snob")}'>`
                if (unitName == "Lkav") return `<img src='${DBInfo.dsCDNUnit("light")}'>`
                if (unitName == "Skav") return `<img src='${DBInfo.dsCDNUnit("heavy")}'>`
                return DBInfo.escapeHTML(unitName)
            },
            generateUnitTableRow(unitsRaw, sanitizedType, time, rowCount, lossType) {
 
                let unitData = ""
                DBInfo.supported_units.forEach(unit => {
                    if(! game_data.units.includes(unit)) return
                    const accessPart = (lossType?"loss_":"") + unit
                    unitData += "<td>" + DBInfo.escapeHTML(unitsRaw[accessPart]) + "</td>"
                })
 
                return `
                    <tr class='nowrap row_${(rowCount % 2) == 0 ? "a" : "b"}'>
                        <th>${sanitizedType}</th>
                        <td>${DBInfo.timeConverter(time)}</td>
                        ${unitData}
                    </tr>
                `
            },
            generateIncTable(data) {
                data.sos.sort(DBInfo.compareSos)
                var rows = ""
 
                data.sos.forEach((element, idx) => {
                    let incType = "Unbekannt"
                    if(element.type == 1) incType = "Fake"
                    if(element.type == 2) incType = "m\u00F6gliche Off"
                    if(element.type == 3) incType = "Off"
                    if(element.type == 4) incType = "AG"
 
                    let params = new URLSearchParams(document.location.search)
                    var actualLink =  document.location.href.split("?")[0]  + "?village=" + params.get("village") + "&screen=info_village&id=" + element.attacker_koords_id
                    var unitSanitized = DBInfo.unitNameToSaveImg(element.Unit)
                    rows += `
                    <tr class='nowrap row_${(idx % 2) == 0 ? "a" : "b"}'>
                        <th>${idx + 1}</th>
                        <td>${unitSanitized}</td>
                        <td><a href='${actualLink}'>${DBInfo.escapeHTML(element.attacker_koords)}</a></td>
                        <td>${DBInfo.timeConverter(element.fighttime)}</td>
                        <td><span class='timer'>${DBInfo.getFormatedTimeLeftToUnixTimestamp(element.fighttime)}</span></td>
                        <td>${incType}</td>
                        <td>${DBInfo.escapeHTML(element.reason)}</td>
                    </tr>
                    `
                })
 
                return `
                <div id='inc_infos' width='100%'>
                    <table class='vis overview_table' width='100%' style='vertical-align:middle'>
                    <thead>
                        <th>Nr.</th><th>Einheit</th><th>Herkunft</th><th>Ankunft</th><th>Ankunft in</th><th>Typ</th><th>Grund</th>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                    </table>
                </div>
                `
            },
            open(data, x, y) {
                var output = "<br /><div><h3>Datenbankinfo:</h3></div>"
 
                var villagetype = data.type == 0 ? "Deff" : data.type == 1 ? "Off" : "Unbekannt"
                var linkToAllVillageDetails = win.serverConfig.villageDetail.replace("$$village$$", DBInfo.escapeHTML(data.village_id))
                output += "<div>Dorftyp: <b>" + villagetype + "</b><br /><a href='" + linkToAllVillageDetails + "' target='_blank'>Datenbank Dorfakte</a></div><br />"
 
                let rowCount = 0
                let rows = ""
                if (localStorage.getItem('dbMode') === "SF" && data.unit_time) {
                    rows += DBInfo.generateUnitTableRow(data, "Im Dorf", data.unit_time, rowCount)
                    rowCount++
                }
                if (data.attack_report.fighttime) {
                    const linkToAttackReport = win.serverConfig.reportPage.replace("$$reportID$$", DBInfo.escapeHTML(data.attack_report.report_id))
                    const typeInfoAtt = "<a href='" + linkToAttackReport + "' target='_blank'>Letzter Angriff</a>"
                    rows += DBInfo.generateUnitTableRow(data.attack_report, typeInfoAtt, data.attack_report.fighttime, rowCount, false)
                    rowCount++
 
                    const typeInfoLoss = "<a href='" + linkToAttackReport + "' target='_blank'>Verlust Angriff</a>"
                    rows += DBInfo.generateUnitTableRow(data.attack_report, typeInfoLoss, data.attack_report.fighttime, rowCount, true)
                    rowCount++
                }
                if (data.defend_report.fighttime) {
                    const linkToDefendReport = win.serverConfig.reportPage.replace("$$reportID$$", DBInfo.escapeHTML(data.defend_report.report_id))
                    const typeInfoDef = "<a href='" + linkToDefendReport + "' target='_blank'>Letzte Verteidigung</a>"
                    rows += DBInfo.generateUnitTableRow(data.defend_report, typeInfoDef, data.defend_report.fighttime, rowCount, false)
                    rowCount++
                }
                if (rows) {
                    let unitHeader = ""
                    DBInfo.supported_units.forEach(unit => {
                        if(! game_data.units.includes(unit)) return
                        unitHeader+= "<th><img src='" + DBInfo.dsCDNUnit(unit) + "'></th>"
                    })
                    output += `
                    <div id='unit_infos' width='100%'>
                        <table class='vis overview_table' width='100%' style='vertical-align:middle'>
                        <thead>
                            <th>Typ</th>
                            <th>Datum</th>
                            ${unitHeader}
                        </thead>
                        <tbody>${rows}</tbody>
                        </table>
                    </div><br />`
                }
 
                output += "<div><p>Eingehende Angriffe: <b>" + DBInfo.escapeHTML(data.attacks) + "</b></p></div>"
 
                if (data.attacks > 0) {
                    output += DBInfo.generateIncTable(data)
                }
 
                if (data.report_id) {
                    const linkToReport = win.serverConfig.reportPage.replace("$$reportID$$", DBInfo.escapeHTML(data.report_id))
                    output += "<br /><div>Letzter Report: <a href='" + linkToReport + "' target='_blank'>" + DBInfo.timeConverter(data.report_fighttime) + "</a></div>"
                }
 
                var linkToAllReports = win.serverConfig.allReportsPage
                        .replace("$$x$$", DBInfo.escapeHTML(x)).replace("$$y$$", DBInfo.escapeHTML(y))
                output += "<div><a href='" + linkToAllReports + "' target='_blank'>Alle Reports</a></div>"
 
                $(".vis .edit_notes_row").parent()[0].insertAdjacentHTML('beforeend', `
                <tr>
                    <td>
                        ${output}
                    </td>
                </tr>
                `)
                Timing.resetTickHandlers()
            },
            openWidget(data) {
                $('#show_summary')[0].insertAdjacentHTML('afterend', `
                <div>
                    <div id='db_widget' class='vis widget'>
                        <h4 class='head'>Datenbank</h4>
                        <div class='widget_content' style='display: block'>
                            ${DBInfo.generateIncTable(data)}
                        </div>
                    </div>
                </div>
                `)
                Timing.resetTickHandlers()
            },
            openAttackDetail() {
                var incTable = $('#incomings_table > tbody > tr');
            
                // add row to header
                $("#incomings_table tr:first-child th:last-child")[0].insertAdjacentHTML('afterend', "<th>DB-Info</th>");
            
                // increase length of table footer
                $("#incomings_table tr:last-child th:last-child")[0].colSpan++;
            
                for (let index = 1; index < incTable.length - 1; index++) {
                    const element = incTable[index];
            
                    var regEx = new RegExp("[0-9]{3}[|][0-9]{3}");
                    regEx.global = true;
                    var raw = element.children[1].innerText;
                    var result = regEx.exec(raw);
                    var coords = result[0].split('|');
            
                    var arrivalRaw = element.children[5].innerText;
                    var arrivalRegEx = new RegExp("[0-9]{2}[:][0-9]{2}[:][0-9]{2}");
                    var regexArrivalResult = arrivalRegEx.exec(arrivalRaw);
                    var arrival = regexArrivalResult[0];
            
                    // Entferne das Bild
                    var imgElement = element.querySelector('img');
                    if (imgElement) {
                        imgElement.remove();
                    }
            
                    // Füge die Informationen direkt ein
                    element.insertAdjacentHTML('beforeend', `
                        <td>
                            Angriff von: ${coords[0]}, ${coords[1]}<br>
                            Ankunft: ${arrival}<br>
                            <div id="attackInfo_${index}"></div>
                        </td>
                    `);
            
                    // Rufe die Funktion showAttackDetail auf, um die Informationen in das entsprechende Div-Element einzufügen
                    DBInfo.showAttackDetail(coords[0], coords[1], arrival, index);
                }
            },
            showAttackDetail(data, x, y, arrival) {
                var possibleAttacks = data.sos.filter(
                    element => DBInfo.timeConverter(element.fighttime).includes(arrival))
 
                var message = ""
                possibleAttacks.forEach(element => {
                    var incType = element.type == 1 ? "Fake" : element.type == 2 ? "m\u00F6gliche Off" : element.type == 3 ? "Off" : element.type == 4 ? "AG" : "Unbekannt"
                    message = "Angriff von: " + DBInfo.escapeHTML(element.attacker_koords) + " Typ: " + DBInfo.escapeHTML(incType) + " Grund: " + DBInfo.escapeHTML(element.reason) + "\n"
                })
                if (message) {
                    UI.SuccessMessage(message, 4000)
                } else {
                    UI.ErrorMessage("Bitte erst Angriffe in Datenbank einlesen.", 4000)
                }
            },
        }
        DBInfo.init()
    }
})()
