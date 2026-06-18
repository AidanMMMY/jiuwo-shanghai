import type { CalendarEventsData } from '@/lib/data';

interface EventCalendarProps {
  data: CalendarEventsData;
  isZh?: boolean;
}

function formatDate(dateStr: string, isZh: boolean): { month: string; day: string } {
  const date = new Date(dateStr + 'T00:00:00');
  const monthsEn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthsZh = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return {
    month: isZh ? monthsZh[date.getMonth()] : monthsEn[date.getMonth()],
    day: String(date.getDate()).padStart(2, '0'),
  };
}

export default function EventCalendar({ data, isZh = false }: EventCalendarProps) {
  const titleEn = 'Upcoming Events';
  const titleZh = '近期活动';
  const emptyTextEn = 'No upcoming events. Check back soon!';
  const emptyTextZh = '近期暂无活动，敬请期待！';

  return (
    <section className="bg-[#0a0a0a] py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs tracking-[0.2em] text-[#c9a227] uppercase">
          {isZh ? titleZh : titleEn}
        </p>
        <div className="border-t border-white/10 mt-4 mb-8" />

        {data.events.length === 0 ? (
          <p className="text-sm text-[#505050] italic text-center py-8">
            {isZh ? emptyTextZh : emptyTextEn}
          </p>
        ) : (
          <div className="space-y-0">
            {data.events.map((event, index) => {
              const { month, day } = formatDate(event.date, isZh);
              const title = isZh ? event.titleZh : event.titleEn;
              const description = isZh ? event.descriptionZh : event.descriptionEn;

              return (
                <div
                  key={index}
                  className="flex gap-6 md:gap-10 py-6 border-b border-white/5"
                >
                  <div className="w-16 flex-shrink-0 text-center">
                    <p className="text-[10px] tracking-[0.15em] text-[#808080] uppercase">
                      {month}
                    </p>
                    <p className="text-3xl md:text-4xl font-serif text-[#f5f5f0] leading-none mt-1">
                      {day}
                    </p>
                    <div className="w-8 h-px bg-[#c9a227] mx-auto mt-1" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl text-[#f5f5f0]">
                      {title}
                    </h3>
                    <p className="text-sm text-[#808080] mt-2 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
