"""Opt-in native RESP/TLS compatibility probe, after explicit resource approval.
Reads VALKEY_* from the process environment; never logs secrets/server replies.
Writes only expiring tripnote:compat:<uuid> keys. No CONFIG SET or FLUSH.
A passing primitive probe is not a substitute for the real API auth flow.
"""
import hashlib, json, os, socket, ssl, sys, time, uuid

class Redis:
    def __init__(self):
        host=os.environ['VALKEY_HOST'];port=int(os.environ['VALKEY_PORT'])
        raw=socket.create_connection((host,port),timeout=10)
        self.sock=ssl.create_default_context().wrap_socket(raw,server_hostname=host)
        self.file=self.sock.makefile('rb')
        self.cmd('AUTH',os.environ.get('VALKEY_USERNAME','default'),os.environ['VALKEY_PASSWORD'])
    def read(self):
        line=self.file.readline()
        if not line:raise RuntimeError('Connection closed')
        kind,value=line[:1],line[1:-2]
        if kind==b'+':return value
        if kind==b'-':raise RuntimeError('Redis command rejected')
        if kind==b':':return int(value)
        if kind==b'$':
            n=int(value)
            if n<0:return None
            data=self.file.read(n);assert self.file.read(2)==b'\r\n';return data
        if kind==b'*':return [self.read() for _ in range(int(value))]
        raise RuntimeError('Unexpected Redis response')
    def cmd(self,*args):
        args=[x if isinstance(x,bytes) else str(x).encode() for x in args]
        self.sock.sendall(b'*'+str(len(args)).encode()+b'\r\n'+b''.join(b'$'+str(len(x)).encode()+b'\r\n'+x+b'\r\n' for x in args))
        return self.read()
    def close(self):self.file.close();self.sock.close()

def probe():
    r=Redis();sub=None;prefix='tripnote:compat:'+uuid.uuid4().hex
    keys=[prefix+suffix for suffix in [':value',':hash',':set',':sorted',':expire']]
    checks=[]
    try:
        assert r.cmd('PING')==b'PONG';assert r.cmd('SELECT',0)==b'OK';checks.append('TLS AUTH PING SELECT')
        assert r.cmd('SET',keys[0],0,'EX',300)==b'OK'
        assert r.cmd('INCR',keys[0])==1
        assert r.cmd('EXPIRE',keys[0],300)==1
        assert r.cmd('GET',keys[0])==b'1';assert r.cmd('TTL',keys[0])>0
        checks.append('GET SET INCR EXPIRE TTL')
        binary=b'\xac\xed\x00\x05synthetic-session'
        assert r.cmd('HSET',keys[1],'sessionAttr:fixture',binary)==1
        r.cmd('EXPIRE',keys[1],300)
        assert binary in r.cmd('HGETALL',keys[1]);checks.append('binary session hash')
        r.cmd('SADD',keys[2],'fixture');r.cmd('EXPIRE',keys[2],300)
        assert r.cmd('SMEMBERS',keys[2])==[b'fixture'];r.cmd('SREM',keys[2],'fixture')
        r.cmd('ZADD',keys[3],1,'fixture');r.cmd('EXPIRE',keys[3],300)
        assert r.cmd('ZRANGEBYSCORE',keys[3],0,2)==[b'fixture'];r.cmd('ZREM',keys[3],'fixture')
        checks.append('set and sorted session indexes')
        script="return redis.call('GET', KEYS[1])"
        assert r.cmd('EVAL',script,1,keys[0])==b'1'
        assert r.cmd('EVALSHA',hashlib.sha1(script.encode()).hexdigest(),1,keys[0])==b'1'
        checks.append('EVAL EVALSHA')
        assert r.cmd('MULTI')==b'OK';assert r.cmd('GET',keys[0])==b'QUEUED'
        assert r.cmd('EXEC')==[b'1'];checks.append('MULTI EXEC')
        config=r.cmd('CONFIG','GET','notify-keyspace-events')
        assert len(config)==2 and config[0]==b'notify-keyspace-events'
        flags=config[1].decode();assert 'E' in flags and ('A' in flags or all(c in flags for c in 'gx'))
        sub=Redis();assert sub.cmd('PSUBSCRIBE','__keyevent@0__:expired')[0]==b'psubscribe'
        r.cmd('SET',keys[4],'fixture','EX',1)
        deadline=time.monotonic()+8;found=False
        while time.monotonic()<deadline:
            event=sub.read()
            if event[-1]==keys[4].encode():found=True;break
        assert found;checks.append('existing Egx flags and expired Pub/Sub event')
        print(json.dumps({'passed':True,'checks':checks,'limits':['must still run API login, password reset/revoke, API restart, TTL and quota checks on approved service']}))
    finally:
        try:r.cmd('DEL',*keys)
        finally:
            r.close()
            if sub:sub.close()
if __name__=='__main__':
    if os.environ.get('TRIPNOTE_APPROVED_REDIS_PROBE')!='1':
        sys.exit('Not run: explicit approved probe opt-in required.')
    try:probe()
    except Exception:
        print(json.dumps({'passed':False,'reason':'Compatibility probe failed; credentials and raw replies suppressed'}));sys.exit(1)
