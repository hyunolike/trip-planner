"""Private-network fixture test. Never prints tokens, cookies, mail bodies or passwords."""
import sys
import pathlib
import concurrent.futures
import statistics
import http.client
import http.cookies
import json
import re
import time
import urllib.parse

request_ms=[]
def request(method, path, body=None, cookies=None, host='api.test'):
    started=time.monotonic()
    cookies = cookies if cookies is not None else {}
    headers = {'Host':host, 'Content-Type':'application/json',
               'Cookie':'; '.join(k+'='+v for k,v in cookies.items())}
    if method not in ['GET','HEAD'] and 'XSRF-TOKEN' in cookies:
        headers['X-XSRF-TOKEN'] = urllib.parse.unquote(cookies['XSRF-TOKEN'])
    c = http.client.HTTPConnection('api',8080,timeout=90)
    try:
        c.request(method,path,json.dumps(body) if body is not None else None,headers)
        r=c.getresponse(); data=r.read()
        for name,value in r.getheaders():
            if name.lower()=='set-cookie':
                jar=http.cookies.SimpleCookie();jar.load(value)
                for k,v in jar.items():cookies[k]=v.value
        try: parsed=json.loads(data) if data else None
        except ValueError: parsed=None
        request_ms.append(round((time.monotonic()-started)*1000,1))
        return r.status,parsed
    finally:c.close()

phase=sys.argv[1]
state=pathlib.Path('/results/session.json')
if phase=='after':
    saved=json.loads(state.read_text());cookies=saved['cookies'];trip=saved['trip'];share=saved['share']
    assert request('GET','/api/v1/me',cookies=cookies)[0]==200
    status,doc=request('GET','/api/v1/trips/'+trip['slug'],cookies=cookies)
    assert status==200 and doc['title']=='After edit'
    assert request('GET','/api/v1/share/'+share['token'])[0]==200
    request('GET','/api/v1/auth/csrf',cookies=cookies)
    assert request('DELETE','/api/v1/trips/'+trip['id']+'/share-links/'+share['id'],cookies=cookies)[0]==204
    assert request('GET','/api/v1/share/'+share['token'])[0]==404
    assert request('POST','/api/v1/auth/logout',cookies=cookies)[0]==204
    assert request('GET','/api/v1/me',cookies=cookies)[0]==401
    assert len(saved['sessions'])==5
    for session in saved['sessions']:
        assert request('GET','/api/v1/me',cookies=session)[0]==200
    jar={};request('GET','/api/v1/auth/csrf',cookies=jar)
    assert request('POST','/api/v1/auth/password-reset',{'email':'local-prep@benchmark.invalid'},jar)[0]==202
    reset_token=None
    for _ in range(60):
        c=http.client.HTTPConnection('mail',8025,timeout=5)
        c.request('GET','/api/v1/messages');r=c.getresponse();messages=json.loads(r.read()).get('messages',[]);c.close()
        for message in messages:
            c=http.client.HTTPConnection('mail',8025,timeout=5)
            c.request('GET','/api/v1/message/'+message['ID']);r=c.getresponse();mail=json.loads(r.read());c.close()
            match=re.search(r'/reset-password\?token=([A-Za-z0-9_-]+)',mail.get('Text',''))
            if match:reset_token=match[1];break
        if reset_token:break
        time.sleep(1)
    assert reset_token is not None,'Synthetic reset mail not received'
    assert request('POST','/api/v1/auth/password-reset/confirm',{'token':reset_token,'password':'trip-note-reset-2027!'},jar)[0]==200
    assert saved['sessions']
    for session in saved['sessions']:
        assert request('GET','/api/v1/me',cookies=session)[0]==401
    request('GET','/api/v1/auth/csrf',cookies=jar)
    assert request('POST','/api/v1/auth/login',{'email':'local-prep@benchmark.invalid','password':'trip-note-reset-2027!'},jar)[0]==200
    print(json.dumps({'passed':True,'checks':['session survives API restart','edited trip survives restart','share survives restart','share revocation','logout invalidates session','password reset revokes all 5 concurrent sessions','new password login'],'maxHttpRequestMs':max(request_ms)}))
    sys.exit(0)
assert request('GET','/api/v1/me')[0]==401
cookies={}; request('GET','/api/v1/auth/csrf',cookies=cookies)
password='trip-note-e2e-2027!'
email='local-prep@benchmark.invalid'
assert request('POST','/api/v1/auth/signup',{'email':email,'nickname':'Synthetic','password':password},cookies)[0]==202
token=None
for _ in range(60):
    c=http.client.HTTPConnection('mail',8025,timeout=5)
    c.request('GET','/api/v1/messages');r=c.getresponse();messages=json.loads(r.read()).get('messages',[]);c.close()
    if messages:
        c=http.client.HTTPConnection('mail',8025,timeout=5)
        c.request('GET','/api/v1/message/'+messages[0]['ID']);r=c.getresponse();mail=json.loads(r.read());c.close()
        match=re.search(r'token=([A-Za-z0-9_-]+)',mail.get('Text',''))
        if match:token=match[1];break
    time.sleep(1)
assert token is not None,'Synthetic verification mail not received'
assert request('POST','/api/v1/auth/verify-email',{'token':token,'password':password},cookies)[0]==200
request('GET','/api/v1/auth/csrf',cookies=cookies)
assert request('POST','/api/v1/auth/login',{'email':email,'password':password},cookies)[0]==200
assert '__Host-SESSION' in cookies
request('GET','/api/v1/auth/csrf',cookies=cookies)
assert request('GET','/api/v1/me',cookies=cookies)[0]==200
status,trip=request('POST','/api/v1/trips',{'title':'Synthetic packaging check','startDate':'2027-01-01','endDate':'2027-01-02','city':'Synthetic'},cookies)
assert status==201
assert request('GET','/api/v1/trips/'+trip['slug'],cookies=cookies)[0]==200
status,doc=request('GET','/api/v1/trips/'+trip['slug'],cookies=cookies)
assert status==200
status,edited=request('PATCH','/api/v1/trips/'+trip['id'],{'version':doc['version'],'title':'After edit'},cookies)
assert status==200
status,share=request('POST','/api/v1/trips/'+trip['id']+'/share-links',cookies=cookies)
assert status==201
assert request('GET','/api/v1/share/'+share['token'])[0]==200

sessions=[]
def worker(i):
    jar=dict(cookies)
    start=time.monotonic()
    if i%3==0:
        jar={}
        request('GET','/api/v1/auth/csrf',cookies=jar)
        status,_=request('POST','/api/v1/auth/login',{'email':email,'password':password},jar)
        if status==200:sessions.append(dict(jar))
    else:
        status,_=request('GET','/api/v1/trips/'+trip['slug'],cookies=jar)
    return status,round((time.monotonic()-start)*1000,1)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    results=list(pool.map(worker,range(15)))
assert all(status==200 for status,_ in results), 'Concurrent request failed'
state.write_text(json.dumps({'cookies':cookies,'trip':trip,'share':share,'sessions':sessions}));state.chmod(0o600)
latency=sorted(ms for _,ms in results)
print(json.dumps({'passed':True,'checks':['CSRF','signup','local verification mail','Argon2 login','trip create/read/edit','anonymous token share','5 concurrent clients / 15 operations + 5 CSRF reads'],
    'operations':len(results),'httpRequests':len(results)+len(sessions),'errors':sum(status!=200 for status,_ in results),'p95Ms':latency[int(len(latency)*0.95)]}))
