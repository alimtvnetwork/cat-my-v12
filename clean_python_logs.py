import pathlib

def clean():
    # frame_artifact.py
    p = pathlib.Path('BE/app/db/writers/frame_artifact.py')
    c = p.read_text('utf-8')
    c = c.replace('_log.error(\n            "frame_artifact.write.db_error RunSessionId=%s Count=%d: %s",\n            run_session_id, len(prepared), exc,\n        )', '')
    p.write_text(c, 'utf-8')

    # rule_result.py
    p = pathlib.Path('BE/app/db/writers/rule_result.py')
    c = p.read_text('utf-8')
    c = c.replace('_log.error(\n            "rule_result.write.db_error RunSessionId=%s Count=%d: %s",\n            run_session_id, len(prepared), exc,\n        )', '')
    p.write_text(c, 'utf-8')

    # run_session.py
    p = pathlib.Path('BE/app/db/writers/run_session.py')
    c = p.read_text('utf-8')
    c = c.replace('_log.error(\n            "run_session.write.db_error RunSessionId=%s: %s",\n            run_session_id, exc,\n        )', '')
    p.write_text(c, 'utf-8')

    # retention.py
    p = pathlib.Path('BE/app/retention.py')
    c = p.read_text('utf-8')
    c = c.replace('_log.error(\n            "retention.query_failed op=%s cutoff=%d err=%s",\n            "fetch_doomed", cutoff, exc,\n        )', '')
    c = c.replace('_log.error(\n                "retention.db.delete_failed op=%s ids=%d err=%s",\n                "delete_run_sessions", len(doomed_ids), exc,\n            )', '')
    p.write_text(c, 'utf-8')

if __name__ == '__main__':
    clean()
