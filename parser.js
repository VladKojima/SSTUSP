const express = require('express');
const fs = require('fs');

const app = express();
const PORT = 3000; // Порт, на котором будет работать сервер
const START_URL = "https://rasp.sstu.ru";

// Регулярные выражения для парсинга
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

// Middleware для парсинга JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Отправляем HTML-форму для ввода названия группы
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Расписание</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                    color: #333;
                    margin: 0;
                    padding: 20px;
                }
                h1 {
                    color: #4CAF50;
                }
                form {
                    margin-bottom: 20px;
                }
                input[type="text"] {
                    padding: 10px;
                    width: 300px;
                    margin-right: 10px;
                }
                button {
                    padding: 10px 15px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                button:hover {
                    background-color: #45a049;
                }
                ul {
                    list-style-type: none;
                    padding: 0;
                }
                li {
                    background: #fff;
                    margin: 5px 0;
                    padding: 10px;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                h2 {
                    color: #333;
                }
                h3 {
                    margin: 0;
                }
            </style>
        </head>
        <body>
            <h1>Получить расписание</h1>
            <form method="POST" action="/fetch">
                <label for="groupName">Введите название группы:</label>
                <input type="text" id="groupName" name="groupName" required>
                <button type="submit">Отправить</button>
            </form>
        </body>
        </html>
    `);
});

// Обрабатываем запрос на получение данных о группе
app.post('/fetch', async (req, res) => {
    const name = req.body.groupName;

    try {
        const { default: fetch } = await import('node-fetch'); // Динамический импорт
        const response = await fetch(START_URL);
        const rhtml = await response.text();
        const groups = [...rhtml.matchAll(groupLinkRE)].map(m => m.groups);
        const group = groups.find(g => g.name.trim() === name.trim());

        if (!group) {
            return res.send('Группа не найдена');
        }

        const groupId = group.id;

        const groupResponse = await fetch(START_URL + getGroupLink(groupId), { headers: { 'Accept': 'text/html' } });
        const groupHtml = await groupResponse.text();
        const weeks = (groupHtml.match(weekRE) ?? [])
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
            }));

        // Отображаем данные на веб-странице
        res.send(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Расписание для группы "${name}"</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        color: #333;
                        margin: 0;
                        padding: 20px;
                    }
                    h1 {
                        color: #4CAF50;
                    }
                    ul {
                        list-style-type: none;
                        padding: 0;
                    }
                    li {
                        background: #fff;
                        margin: 5px 0;
                        padding: 10px;
                        border-radius: 5px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    }
                    h2 {
                        color: #333;
                    }
                    h3 {
                        margin: 0;
                    }
                </style>
            </head>
            <body>
                <h1>Расписание для группы "${name}"</h1>
                ${weeks.map(week => `
                    <h2>Неделя ${week.days[0].date}</h2>
                    <ul>
                        ${week.days.map(day => `
                            <li>
                                <h3>${day.date}</h3>
                                <ul>
                                    ${day.lessons.map(lesson => `
                                        <li>
                                            <p>Предмет: ${lesson.name}</p>
                                            <p>Аудитория: ${lesson.room}</p>
                                            <p>Тип: ${lesson.type}</p>
                                            <p>Преподаватель: ${lesson.teacher}</p>
                                            <p>Время: ${lesson.hour}</p>
                                        </li>
                                    `).join('')}
                                </ul>
                            </li>
                        `).join('')}
                    </ul>
                `).join('')}
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Произошла ошибка:', error);
        res.send('Произошла ошибка');
    }
});

// Запускаем сервер
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});