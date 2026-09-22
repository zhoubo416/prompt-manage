-- API Key 增加权限范围:read 只能查询,write 可以调用维护接口
-- 默认只读,已经发出去的 Key 不会自动获得写权限

alter table api_keys add column access text not null default 'read';

alter table api_keys add constraint api_keys_access_check check (access in ('read', 'write'));
