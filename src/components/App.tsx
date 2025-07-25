import React, { useState, useEffect } from 'react';

interface Rule {
    pattern: string;
    template: string;
}

const App: React.FC = () => {
    const [tabName, setTabName] = useState('');
    const [rules, setRules] = useState<Rule[]>([]);
    const [newPattern, setNewPattern] = useState('');
    const [newTemplate, setNewTemplate] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'edit' | 'rules'>('edit');

    // 加载保存的规则
    useEffect(() => {
        chrome.storage.sync.get(['urlRules'], (result) => {
            setRules(result.urlRules || []);
        });

        // 获取当前标签页的 URL 并自动填入
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
                setCurrentUrl(tabs[0].url);
                setNewPattern(tabs[0].url); // 自动填入当前 URL
            }
        });
    }, []);

    // 保存规则到 storage
    const saveRules = (updatedRules: Rule[]) => {
        chrome.storage.sync.set({ urlRules: updatedRules }, () => {
            setRules(updatedRules);
        });
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTabName(e.target.value);
    };

    const updateTabTitle = async () => {
        if (!tabName.trim()) return;
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (title) => { document.title = title; },
                args: [tabName]
            });
            setTabName('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            updateTabTitle();
        }
    };

    const addRule = () => {
        if (!newPattern.trim() || !newTemplate.trim()) return;
        
        // 检查是否存在相同 URL 的规则
        const existingRuleIndex = rules.findIndex(rule => rule.pattern === newPattern);
        let newRules: Rule[];
        
        if (existingRuleIndex !== -1) {
            // 如果存在相同 URL,更新该规则
            newRules = [...rules];
            newRules[existingRuleIndex] = {
                pattern: newPattern,
                template: newTemplate,
            };
        } else {
            // 如果不存在相同 URL,添加新规则
            newRules = [...rules, {
                pattern: newPattern,
                template: newTemplate,
            }];
        }
        
        saveRules(newRules);
        setNewPattern('');
        setNewTemplate('');
        setActiveTab('rules'); // 添加后切换到规则列表
    };

    const removeRule = (index: number) => {
        const newRules = rules.filter((_, i) => i !== index);
        saveRules(newRules);
    };

    const startEditing = (index: number) => {
        const rule = rules[index];
        setNewPattern(rule.pattern);
        setNewTemplate(rule.template);
        setEditingIndex(index);
        setActiveTab('edit'); // 切换到编辑标签页
    };

    const cancelEditing = () => {
        setNewPattern(currentUrl); // 取消编辑时填入当前 URL
        setNewTemplate('');
        setEditingIndex(null);
    };

    const updateRule = () => {
        if (editingIndex === null || !newPattern.trim() || !newTemplate.trim()) return;
        
        const newRules = [...rules];
        newRules[editingIndex] = {
            pattern: newPattern,
            template: newTemplate,
        };
        saveRules(newRules);
        cancelEditing();
        setActiveTab('rules'); // 更新后切换到规则列表
    };

    const addOrUpdateRule = () => {
        if (!newPattern.trim() || !newTemplate.trim()) return;
        
        if (editingIndex !== null) {
            updateRule();
        } else {
            addRule();
        }
    };

    const addConfExample = () => {
        const newRules = [
            ...rules,
            {
                pattern: 'http://example.com/page',
                template: '示例页面'
            }
        ];
        saveRules(newRules);
        setActiveTab('rules'); // 添加后切换到规则列表
    };

    return (
        <div className="popup">
            <div className="tabs">
                <ul className="tab-list">
                    <li 
                        className={`tab-item ${activeTab === 'edit' ? 'active' : ''}`}
                        onClick={() => setActiveTab('edit')}
                    >
                        添加规则
                    </li>
                    <li 
                        className={`tab-item ${activeTab === 'rules' ? 'active' : ''}`}
                        onClick={() => setActiveTab('rules')}
                    >
                        规则列表 ({rules.length})
                    </li>
                </ul>
            </div>

            {activeTab === 'edit' && (
                <div>
                    {/* 手动修改标题 */}
                    <div className="section">
                        <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>手动修改标题</h2>
                        <input
                            type="text"
                            value={tabName}
                            onChange={handleNameChange}
                            onKeyDown={handleKeyDown}
                            placeholder="输入新的标题后回车"
                            className="input"
                            autoFocus // 添加自动聚焦
                        />
                    </div>

                    {/* 添加/编辑规则 */}
                    <div className="section">
                        <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>
                            {editingIndex !== null ? '编辑规则' : '添加 URL 规则'}
                        </h2>
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={newPattern}
                                    onChange={(e) => setNewPattern(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newPattern && newTemplate) {
                                            addOrUpdateRule();
                                        }
                                    }}
                                    placeholder="输入完整 URL"
                                    className="input"
                                    style={{ flex: 1 }}
                                />
                                <button 
                                    onClick={() => setNewPattern(currentUrl)}
                                    className="button"
                                    style={{ whiteSpace: 'nowrap', backgroundColor: '#1890ff' }}
                                >
                                    使用当前 URL
                                </button>
                            </div>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <input
                                type="text"
                                value={newTemplate}
                                onChange={(e) => setNewTemplate(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newPattern && newTemplate) {
                                        addOrUpdateRule();
                                    }
                                }}
                                placeholder="输入标题"
                                className="input"
                            />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                                使用固定文本作为标题
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                                onClick={addOrUpdateRule} 
                                className="button"
                            >
                                {editingIndex !== null ? '保存修改' : '添加规则'}
                            </button>
                            {editingIndex !== null && (
                                <button 
                                    onClick={cancelEditing}
                                    className="button"
                                    style={{ backgroundColor: '#ff7875' }}
                                >
                                    取消编辑
                                </button>
                            )}
                            {editingIndex === null && (
                                <>
                                    <button 
                                        onClick={addConfExample} 
                                        className="button" 
                                        style={{ backgroundColor: '#722ed1' }}
                                    >
                                        示例
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'rules' && (
                <div className="rules-table-container">
                    <table className="rules-table">
                        <thead>
                            <tr>
                                <th>URL 规则</th>
                                <th>标题</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((rule, index) => (
                                <tr key={index}>
                                    <td 
                                        style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        title={rule.pattern}
                                    >
                                        {rule.pattern}
                                    </td>
                                    <td 
                                        style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        title={rule.template}
                                    >
                                        {rule.template}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                onClick={() => startEditing(index)}
                                                className="edit-button"
                                                disabled={editingIndex !== null}
                                            >
                                                编辑
                                            </button>
                                            <button 
                                                onClick={() => removeRule(index)}
                                                className="delete-button"
                                                disabled={editingIndex !== null}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default App;