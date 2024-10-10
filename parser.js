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