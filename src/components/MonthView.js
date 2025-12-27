export class MonthView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.calendar = null;
        this.currentDate = new Date();
    }

    connectedCallback() {
        this.render();
    }

    setCalendar(calendar) {
        this.calendar = calendar;
        this.render();
    }

    setEvents(events) {
        if (this.calendar) {
            events.forEach(event => this.calendar.addEvent(event));
            this.render();
        }
    }

    render() {
        const month = this.currentDate.getMonth();
        const year = this.currentDate.getFullYear();

        const monthData = this.calendar ?
            this.calendar.getMonthView(year, month) :
            this.generateEmptyMonth(year, month);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .calendar-month {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px;
                    background: #e0e0e0;
                    border: 1px solid #e0e0e0;
                }
                .calendar-header {
                    padding: 10px;
                    text-align: center;
                    font-weight: bold;
                    background: #f5f5f5;
                }
                .calendar-day {
                    background: white;
                    min-height: 80px;
                    padding: 5px;
                    position: relative;
                }
                .calendar-day-number {
                    font-size: 14px;
                    color: #333;
                }
                .calendar-day.other-month .calendar-day-number {
                    color: #ccc;
                }
                .calendar-event {
                    font-size: 11px;
                    background: #4285f4;
                    color: white;
                    padding: 2px 4px;
                    margin: 2px 0;
                    border-radius: 3px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            </style>
            <div class="calendar-month">
                ${this.renderHeader()}
                ${this.renderDays(monthData)}
            </div>
        `;
    }

    renderHeader() {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days.map(day =>
            `<div class="calendar-header">${day}</div>`
        ).join('');
    }

    renderDays(monthData) {
        if (!monthData.weeks) return '';

        return monthData.weeks.map(week =>
            week.days.map(day => {
                const otherMonth = day.isOtherMonth ? 'other-month' : '';
                const events = day.events || [];

                return `
                    <div class="calendar-day ${otherMonth}">
                        <div class="calendar-day-number">${day.day}</div>
                        ${events.map(event =>
                            `<div class="calendar-event">${event.title}</div>`
                        ).join('')}
                    </div>
                `;
            }).join('')
        ).join('');
    }

    generateEmptyMonth(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const weeks = [];
        let currentDate = new Date(startDate);

        for (let week = 0; week < 6; week++) {
            const days = [];
            for (let day = 0; day < 7; day++) {
                days.push({
                    date: new Date(currentDate),
                    day: currentDate.getDate(),
                    isOtherMonth: currentDate.getMonth() !== month,
                    events: []
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            weeks.push({ days });
            if (currentDate.getMonth() !== month && week > 3) break;
        }

        return { weeks };
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }
}

customElements.define('force-calendar-month', MonthView);