-- Finalise each game day's percentiles and labels shortly after the 3 AM
-- Eastern reset. Runs hourly (at :05) so it is correct across daylight-saving
-- changes; finalize_game_days() only touches days that have ended.

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'luckdle-finalize-game-days',
  '5 * * * *',
  $$select public.finalize_game_days()$$
);
