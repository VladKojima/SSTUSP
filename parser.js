const http = require('http');

const port = 3000;

const START_URL = "https://rasp.sstu.ru";

const groupLinkRE = /<a href="\/rasp\/group\/(?<id>\d*)">(?<name>[\w\W]*?)<\/a>/g;
const weekRE = /((?<=<div class="week">)[\w\W]*?(?=<div class="week">))|((?<=<div class="week">)[\w\W]*(?=<div))/g;
const dayRE = /(?<=<div class="day (day-current)?">)[\w\W]*?(?=(<div class="day (day-current)?"))|(?<=<div class="day (day-current)?">)[\w\W]*(?=(<div))/g;
const dateRE = /(?<=<div class="day-header">[\w\W]*?<\/span>)[\d.]*(?=<\/div>)/;
const lessonRE = /(?<=<div class="day-lesson")[\w\W]*?(?=(?=<div class="day-lesson"))|(?<=<div class="day-lesson")[\w\W]*(?=<div)/g;
const lessonNameRE = /(?<=<div class="lesson-name">).*?(?=<\/div>)/;
const lessonRoomRE = /(?<=<div class="lesson-room">).*?(?=<\/div>)/;
const lessonTypeRE = /(?<=<div class="lesson-type">).*?(?=<\/div>)/;
const lessonTeacherRE = /(?<=<div class="lesson-teacher"><a.*?>)[a-zA-ZА-Яа-я\s]*(?=<\/a>)/;
const lessonHourRE = /(?<=<div class="lesson-hour">).*?(?=<)/;

function getGroupLink(id) {
    return `/rasp/group/${id}`;
}

function getAllGroups() {
    return fetch(START_URL).then(res=>res.text())
    .then(rhtml => {
        const groups = [...rhtml.matchAll(groupLinkRE)].map(m => m.groups);

        return groups;
    })
}

function getGroupSchedule(groupId) {
    return fetch(START_URL + getGroupLink(groupId), {headers: {'Accept': 'text/html'}})
    .then(res=>res.text())
    .then(rhtml => (rhtml.match(weekRE) ?? [])
            .map(str => ({
                days: (str.match(dayRE) ?? [])
                    .map(day => ({
                        date: day.match(dateRE)?.[0],
                        lessons: (day.match(lessonRE) ?? [])
                            .map(lesson => ({
                                name: lesson.match(lessonNameRE)?.[0],
                                room: lesson.match(lessonRoomRE)?.[0],
                                type: lesson.match(lessonTypeRE)?.[0],
                                teacher: lesson.match(lessonTeacherRE)?.[0],
                                hour: lesson.match(lessonHourRE)?.[0],
                            }))
                    }))
            }))
)}

async function parseAll(){
    const res = [];

    for (const group of await getAllGroups()){
        res.push({...group, schedule: await getGroupSchedule(group.id)});
    }

    return res;
}

http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;

    if (req.method !== "GET") {
        res.write("Unsupported method\n");
        res.statusCode = 405;
    }

    const reqParam = req.url.slice((req.url.match(/(?<=\w+)\//)?.index ?? -1) + 1);

    switch (req.url.slice(1).replace(/\/[\d\w]*/, "")) {
        case "groups":
            const groups = await getAllGroups();
            res.write(JSON.stringify(groups));
            break;
            
        case "schedule":
            if (!/^\d*$/.test(reqParam)) {
                res.write("Group number isn't INT");
                res.statusCode = 400;
                break;
            }

            const id = parseInt(reqParam);

            if (!(await getAllGroups()).find(group => group.id == id)) {
                res.write("Unknown group id");
                res.statusCode = 400;
                break;
            }

            const schedule = await getGroupSchedule(id);

            res.write(JSON.stringify(schedule));

            break;
        
        default:
            res.write("Unknown path");
            res.statusCode = 400;
            break;
    }
    
    if(!res.closed)
        res.end();
})
    .listen(port)