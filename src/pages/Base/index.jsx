import {
    Button,
    Input,
    Space,
    Table,
    Modal,
    Form,
    notification,
    Spin,
    Tag,
    Popconfirm,
    Row, Col, InputNumber, Badge, message, Switch, Pagination, Tooltip
} from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, SlidersOutlined, StopOutlined } from "@ant-design/icons"
import {
    getEthBalance,
    getTxCount,
    getZksEra,
    getZksLite,
    getZkSyncBridge,
    exportToExcel,
    calculateScore,
    getDebankValue,
    getBaseInfo,
    getBaseTx,
    getBaseERC20,
    getBaseBridge,
} from "@utils"
import {useEffect, useState} from "react";
import './index.css';
import {Layout, Card} from 'antd';
import { ethers } from 'ethers';

const {Content} = Layout;
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    PlusOutlined, SettingOutlined,
    SyncOutlined,
    UploadOutlined
} from "@ant-design/icons";

const {TextArea} = Input;

function Base() {
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchLength, setBatchLength] = useState(0);
    const [batchloading, setBatchLoading] = useState(false);
    const [data, setData] = useState([]);
    const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
    const [batchForm] = Form.useForm();
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [hideColumn, setHideColumn] = useState(false);
    const [scoreData, setScoreData] = useState([]);
    const [tableHeight, setTableHeight] = useState(0);    
    const [changeApiForm] = Form.useForm();
    const [apiKey, setApiKey] = useState(localStorage.getItem('base_api_key'));
    const [isChangeApiModalVisible, setIsChangeApiModalVisible] = useState(false);
    const [addressDisplayMode, setAddressDisplayMode] = useState(localStorage.getItem('base_address_display_mode') || 'full'); // 从localStorage获取或默认为'full'

    const getCurrentChinaDate = () => {
        const now = new Date();
        const localOffset = now.getTimezoneOffset();
        const chinaOffset = -480;
        const offsetDiff = (localOffset - chinaOffset) * 60 * 1000;
        const chinaTime = new Date(now.getTime() + offsetDiff);
        
        // 格式化日期和时间
        const date = `${chinaTime.getFullYear()}-${(chinaTime.getMonth() + 1).toString().padStart(2, '0')}-${chinaTime.getDate().toString().padStart(2, '0')}`;
        const time = `${chinaTime.getHours().toString().padStart(2, '0')}:${chinaTime.getMinutes().toString().padStart(2, '0')}`;
        
        return `${date} ${time}`;
    };

    const toggleHideColumn = () => {
        setHideColumn(!hideColumn);
    };
    
    const handleChangeApiOk = () => {
        localStorage.setItem('base_api_key', changeApiForm.getFieldsValue().base);
        setIsChangeApiModalVisible(false);
        setApiKey(localStorage.getItem('base_api_key'));
    }
    useEffect(() => {
        const storedApiKey = localStorage.getItem('base_api_key');
        if (storedApiKey) {
            setApiKey(storedApiKey);
            changeApiForm.setFieldsValue(storedApiKey);
        }
    }, []);
    
    const getNftBalance = async (address) => {
        try {
        const provider = new ethers.JsonRpcProvider('https://mainnet.era.zksync.io');
        const ABI = [
            {
              inputs: [
                {
                  internalType: "address",
                  name: "owner",
                  type: "address",
                },
              ],
              name: "balanceOf",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
          ];
          const contractAddress = "0xd07180c423f9b8cf84012aa28cc174f3c433ee29";
          const contract = new ethers.Contract(contractAddress, ABI, provider);
          const result = await contract.balanceOf(address);
          return {zks_nft: result.toString()};
        } 
        catch (error) {
            console.log(error);
            return {zks_nft: "Error"};
        }
    }

    const getEyeIcon = () => {
    if (hideColumn) {
        return <EyeInvisibleOutlined />;
    }
    return <EyeOutlined />;
    };

    useEffect(() => {
        const handleResize = () => {
            setTableHeight(window.innerHeight - 210);
        };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
        window.removeEventListener('resize', handleResize);
    };
    }, []);

    // 添加一个带超时的请求函数
    const fetchWithTimeout = async (fetchFn, timeout = 15000) => {
        return Promise.race([
            fetchFn(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('请求超时')), timeout)
            )
        ]);
    };

    // 修改重试函数，添加超时处理
    const retryFetch = async (fetchFn, maxRetries = 5, delay = 2000, timeout = 15000) => {
        let retries = 0;
        
        while (retries <= maxRetries) {
            try {
                console.log(`尝试执行请求，当前重试次数: ${retries}`);
                // 使用带超时的请求
                const result = await fetchWithTimeout(() => fetchFn(), timeout);
                console.log("请求结果:", result);
                
                // 检查结果是否为 null 或 undefined
                if (result === null || result === undefined) {
                    console.log("结果为 null 或 undefined，将重试");
                    if (retries < maxRetries) {
                        retries++;
                        message.info(`请求结果为空，正在进行第${retries}次重试...`, 2);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    return "Error"; // 所有重试都失败后返回 Error
                }
                
                // 更严格的检查逻辑
                let hasError = false;
                
                // 检查单个值
                if (result === "Error" || (typeof result === 'number' && isNaN(result))) {
                    console.log("检测到单值错误");
                    hasError = true;
                }
                // 检查对象中的值
                else if (typeof result === 'object' && result !== null) {
                    for (const key in result) {
                        const val = result[key];
                        if (val === "Error" || (typeof val === 'number' && isNaN(val)) || val === null || val === undefined) {
                            console.log(`检测到对象中的错误，键: ${key}, 值: ${val}`);
                            hasError = true;
                            break;
                        }
                    }
                }
                
                if (hasError) {
                    if (retries < maxRetries) {
                        retries++;
                        console.log(`将进行第${retries}次重试`);
                        // 显示重试通知
                        message.info(`检测到错误或NaN值，正在进行第${retries}次重试...`, 2);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                
                return result;
            } catch (error) {
                console.error("请求出错:", error);
                if (retries < maxRetries) {
                    retries++;
                    console.log(`捕获到错误，将进行第${retries}次重试`);
                    // 显示重试通知
                    message.info(`请求出错 (${error.message})，正在进行第${retries}次重试...`, 2);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    return "Error"; // 所有重试都失败后返回 Error，而不是抛出异常
                }
            }
        }
        
        return "Error"; // 确保函数总是返回值
    };

    const handleRefresh = async () => {
        if (!selectedKeys.length) {
            notification.error({
                message: "错误",
                description: "请先选择要刷新的地址",
            }, 2);
            return;
        }
        setIsLoading(true);
        try {
            const limit = 2;
            let activePromises = 0;
            let promisesQueue = [];
            const newData = [...data];
            const processQueue = () => {
                while (activePromises < limit && promisesQueue.length > 0) {
                    const promise = promisesQueue.shift();
                    activePromises += 1;

                    promise().finally(() => {
                        activePromises -= 1;
                        processQueue();
                    });
                }
                if (promisesQueue.length > 0) {
                    setTimeout(processQueue, 2500);
                }
            };
            for (let key of selectedKeys) {
                const index = newData.findIndex(item => item.key === key);
                if (index !== -1) {
                    const item = newData[index];
                    item.query_date = getCurrentChinaDate();
                    promisesQueue.push(() => {
                        item.base_eth_balance = null;
                        return retryFetch(async () => {
                            const result = await getBaseInfo(item.address, apiKey);
                            console.log("getBaseInfo 结果:", result);
                            // 检查 balance 是否为 NaN
                            if (typeof result.balance === 'number' && isNaN(result.balance)) {
                                console.log("检测到 Base ETH 余额为 NaN，将触发重试");
                                result.balance = "Error"; // 修改结果以触发重试
                            }
                            return result;
                        }).then(({balance}) => {
                            item.base_eth_balance = balance;
                            setData([...newData]);
                            localStorage.setItem('base_addresses', JSON.stringify(newData));
                        }).catch(error => {
                            console.error("处理 getBaseInfo 结果时出错:", error);
                            item.base_eth_balance = "Error";
                            setData([...newData]);
                            localStorage.setItem('base_addresses', JSON.stringify(newData));
                        });
                    });
                    promisesQueue.push(async () => {
                        item.base_usdbc_balance = null;
                        item.base_usdc_balance = null;
                        return retryFetch(() => getBaseERC20(item.address, apiKey)).then(({USDbC, USDC}) => {
                            item.base_usdbc_balance = USDbC;
                            item.base_usdc_balance = USDC;
                            setData([...newData]);
                            localStorage.setItem('base_addresses', JSON.stringify(newData));
                        });
                    });
                    promisesQueue.push(() => {
                        item.base_tx_amount = null;
                        item.base_last_tx = null;
                        item.base_last_tx_date = null;
                        item.dayActivity = null;
                        item.weekActivity = null;
                        item.monthActivity = null;
                        item.contractActivity = null;
                        item.totalFee = null;
                        item.query_date = getCurrentChinaDate();
                        return retryFetch(() => getBaseTx(item.address, apiKey)).then(({base_tx_amount, base_last_tx, base_last_tx_date, dayActivity, weekActivity, monthActivity, contractActivity, totalFee, totalExchangeAmount}) => {
                            item.base_tx_amount = base_tx_amount;
                            item.base_last_tx = base_last_tx;
                            item.base_last_tx_date = base_last_tx_date;
                            item.dayActivity = dayActivity;
                            item.weekActivity = weekActivity;
                            item.monthActivity = monthActivity;
                            item.contractActivity = contractActivity;
                            item.totalFee = totalFee;
                            item.totalExchangeAmount = totalExchangeAmount;
                            setData([...newData]);
                            localStorage.setItem('base_addresses', JSON.stringify(newData));
                        });
                    });
                    promisesQueue.push(async () => {
                        item.eth_balance = null;
                        try {
                            // 直接使用 try-catch 和手动重试，不依赖 retryFetch
                            let eth_balance;
                            let retryCount = 0;
                            const maxRetries = 5;
                            
                            while (retryCount <= maxRetries) {
                                try {
                                    eth_balance = await getEthBalance(item.address, "ethereum");
                                    console.log(`尝试 ${retryCount}: getEthBalance 结果:`, eth_balance, 
                                                "类型:", typeof eth_balance, 
                                                "是否NaN:", typeof eth_balance === 'number' && isNaN(eth_balance));
                                    
                                    // 明确检查 NaN
                                    if (typeof eth_balance === 'number' && isNaN(eth_balance)) {
                                        if (retryCount < maxRetries) {
                                            retryCount++;
                                            message.info(`ETH 余额为 NaN，正在进行第${retryCount}次重试...`, 2);
                                            console.log(`ETH 余额为 NaN，正在进行第${retryCount}次重试`);
                                            await new Promise(resolve => setTimeout(resolve, 2000));
                                            continue;
                                        } else {
                                            console.log("达到最大重试次数，将 NaN 转换为 Error");
                                            eth_balance = "Error";
                                            break;
                                        }
                                    }
                                    
                                    // 如果不是 NaN，跳出循环
                                    break;
                                    
                                } catch (error) {
                                    console.error(`尝试 ${retryCount} 出错:`, error);
                                    if (retryCount < maxRetries) {
                                        retryCount++;
                                        message.info(`请求出错，正在进行第${retryCount}次重试...`, 2);
                                        await new Promise(resolve => setTimeout(resolve, 2000));
                                    } else {
                                        console.log("达到最大重试次数，设置为 Error");
                                        eth_balance = "Error";
                                        break;
                                    }
                                }
                            }
                            
                            item.eth_balance = eth_balance;
                            setData([...newData]);
                            localStorage.setItem('base_addresses', JSON.stringify(newData));
                        } catch (error) {
                            console.error("处理 getEthBalance 最终出错:", error);
                            item.eth_balance = "Error";
                            setData([...newData]);
                            localStorage.setItem('base_addresses', JSON.stringify(newData));
                        }
                    });
                    promisesQueue.push(() => {
                        item.eth_tx_amount = null;
                        return retryFetch(() => getTxCount(item.address, "ethereum"), 5, 2000, 20000).then((eth_tx_amount) => {
                            // 检查结果是否仍在加载
                            if (eth_tx_amount === null || eth_tx_amount === undefined) {
                                eth_tx_amount = "Error";
                            }
                            item.eth_tx_amount = eth_tx_amount;
                            setData([...newData]);
                            localStorage.setItem('base_addresses', JSON.stringify(newData));
                        }).catch(error => {
                            console.error("处理 getTxCount 结果时出错:", error);
                            item.eth_tx_amount = "Error";
                            setData([...newData]);
                            localStorage.setItem('base_addresses', JSON.stringify(newData));
                        });
                    });
                    promisesQueue.push(() => {
                        item.l1Tol2Times = null;
                        item.l1Tol2Amount = null;
                        return retryFetch(() => getBaseBridge(item.address, apiKey)).then(({l1Tol2Times, l1Tol2Amount}) => {
                            item.l1Tol2Times = l1Tol2Times;
                            item.l1Tol2Amount = l1Tol2Amount;
                            setData([...newData]);
                            localStorage.setItem('base_addresses', JSON.stringify(newData));
                        });
                    });
                }
            }
            processQueue();
        } catch (error) {
            notification.error({
                message: "错误",
                description: error.message,
            }, 2);
        } finally {
            setIsLoading(false);
            setSelectedKeys([]);
            message.success("刷新成功");
        }
    };

    const handleBatchOk = async () => {
        try {
            setBatchLoading(true);
            setIsBatchModalVisible(false);
            const values = await batchForm.validateFields();
            const addressLines = values.addresses.split("\n");
            const wallets = addressLines.map(line => {
                const [address, name] = line.split(",");
                return { address: address.trim(), name: name ? name.trim() : ''  };
              });
            const addresses = wallets.map(obj => obj.address);
            const names = wallets.map(obj => obj.name);
            setBatchLength(addresses.length);
            const newData = [...data];
            const limit = 3;
            let activePromises = 0;
            let promisesQueue = [];
            setBatchProgress(0);
            const processQueue = () => {
                while (promisesQueue.length > 0 && activePromises < limit) {
                    const promise = promisesQueue.shift();
                    activePromises += 1;

                    promise().finally(() => {
                        activePromises -= 1;
                        processQueue();
                    });
                }
            };

            for (let address of addresses) {
                address = address.trim();
                let note = names[addresses.indexOf(address)];
                if (address.length !== 42) {
                    notification.error({
                        message: "错误",
                        description: "请输入正确的地址",
                    });
                    continue;
                }
                let promiseWithProgress = () => {
                    return new Promise((resolve, reject) => {
                        setBatchProgress(prevProgress => prevProgress + 1);
                        resolve();
                    });
                };
                const index = newData.findIndex(item => item.address === address);
                const item = index !== -1 ? newData[index] : {
                    key: newData.length.toString(),
                    address: address,
                    name: note,
                    eth_balance: null,
                    eth_tx_amount: null,
                    base_eth_balance: null,
                    base_last_tx: null,
                    base_tx_amount: null,
                    base_usdbc_balance: null,
                    base_usdc_balance: null,
                    base_usdtBalance: null,
                    dayActivity: null,
                    weekActivity: null,
                    monthActivity: null,
                    l1Tol2Times: null,
                    l1Tol2Amount: null,
                    l2Tol1Times: null,
                    l2Tol1Amount: null,
                    contractActivity: null,
                    totalFee: null,
                    totalExchangeAmount: null,
                    query_date: getCurrentChinaDate(),
                };
                if (index === -1) {
                    newData.push(item);
                }
                promisesQueue.push(async () => {
                    item.base_eth_balance = null;
                    try {
                        // 第一次尝试
                        let result = await getBaseInfo(item.address, apiKey);
                        console.log("第一次 getBaseInfo 结果:", result);
                        
                        // 检查 balance 是否为 NaN
                        if (typeof result.balance === 'number' && isNaN(result.balance)) {
                            message.info("Base ETH 余额为 NaN，进行第1次重试...", 2);
                            console.log("Base ETH 余额为 NaN，进行第1次重试");
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // 第二次尝试
                            result = await getBaseInfo(item.address, apiKey);
                            console.log("第二次 getBaseInfo 结果:", result);
                            
                            // 继续检查 NaN 并重试，最多5次
                            let currentRetry = 1;
                            while (typeof result.balance === 'number' && isNaN(result.balance) && currentRetry < 5) {
                                currentRetry++;
                                message.info(`Base ETH 余额为 NaN，进行第${currentRetry}次重试...`, 2);
                                console.log(`Base ETH 余额为 NaN，进行第${currentRetry}次重试`);
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                
                                result = await getBaseInfo(item.address, apiKey);
                                console.log(`第${currentRetry+1}次 getBaseInfo 结果:`, result);
                            }
                            
                            // 如果仍然是 NaN，设置为 Error
                            if (typeof result.balance === 'number' && isNaN(result.balance)) {
                                result.balance = "Error";
                            }
                        }
                        
                        item.base_eth_balance = result.balance;
                        setData([...newData]);
                        localStorage.setItem('base_addresses', JSON.stringify(newData));
                    } catch (error) {
                        console.error("处理 getBaseInfo 结果时出错:", error);
                        item.base_eth_balance = "Error";
                        setData([...newData]);
                        localStorage.setItem('base_addresses', JSON.stringify(newData));
                    }
                });
    
                promisesQueue.push(() => retryFetch(() => getBaseERC20(item.address, apiKey)).then(({USDbC, USDC}) => {
                    item.base_usdbc_balance = USDbC;
                    item.base_usdc_balance = USDC;
                }));

                promisesQueue.push(async () => {
                    item.eth_balance = null;
                    try {
                        // 第一次尝试
                        let eth_balance = await getEthBalance(item.address, "ethereum");
                        console.log("第一次 getEthBalance 结果:", eth_balance, "类型:", typeof eth_balance, "是否NaN:", typeof eth_balance === 'number' && isNaN(eth_balance));
                        
                        // 检查 NaN
                        if (typeof eth_balance === 'number' && isNaN(eth_balance)) {
                            message.info("ETH 余额为 NaN，进行第1次重试...", 2);
                            console.log("ETH 余额为 NaN，进行第1次重试");
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // 第二次尝试
                            eth_balance = await getEthBalance(item.address, "ethereum");
                            console.log("第二次 getEthBalance 结果:", eth_balance);
                            
                            // 继续检查 NaN 并重试，最多5次
                            let currentRetry = 1;
                            while (typeof eth_balance === 'number' && isNaN(eth_balance) && currentRetry < 5) {
                                currentRetry++;
                                message.info(`ETH 余额为 NaN，进行第${currentRetry}次重试...`, 2);
                                console.log(`ETH 余额为 NaN，进行第${currentRetry}次重试`);
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                
                                eth_balance = await getEthBalance(item.address, "ethereum");
                                console.log(`第${currentRetry+1}次 getEthBalance 结果:`, eth_balance);
                            }
                            
                            // 如果仍然是 NaN，设置为 Error
                            if (typeof eth_balance === 'number' && isNaN(eth_balance)) {
                                eth_balance = "Error";
                            }
                        }
                        
                        item.eth_balance = eth_balance;
                        setData([...newData]);
                        localStorage.setItem('base_addresses', JSON.stringify(newData));
                    } catch (error) {
                        console.error("处理 getEthBalance 结果时出错:", error);
                        item.eth_balance = "Error";
                        setData([...newData]);
                        localStorage.setItem('base_addresses', JSON.stringify(newData));
                    }
                });

                promisesQueue.push(() => retryFetch(() => getTxCount(item.address, "ethereum"), 5, 2000, 20000).then((eth_tx_amount) => {
                    item.eth_tx_amount = eth_tx_amount;
                }));

                promisesQueue.push(() => retryFetch(() => getBaseTx(item.address, apiKey)).then(({base_tx_amount, base_last_tx, base_last_tx_date, dayActivity, weekActivity, monthActivity, contractActivity, totalFee, totalExchangeAmount}) => {
                    item.base_tx_amount = base_tx_amount;
                    item.base_last_tx = base_last_tx;
                    item.base_last_tx_date = base_last_tx_date;
                    item.dayActivity = dayActivity;
                    item.weekActivity = weekActivity;
                    item.monthActivity = monthActivity;
                    item.contractActivity = contractActivity;
                    item.totalFee = totalFee;
                    item.totalExchangeAmount = totalExchangeAmount;
                }));

                promisesQueue.push(() => retryFetch(() => getBaseBridge(item.address, apiKey)).then(({l1Tol2Times, l1Tol2Amount}) => {
                    item.l1Tol2Times = l1Tol2Times;
                    item.l1Tol2Amount = l1Tol2Amount;
                }));

                promisesQueue.push(promiseWithProgress);
                processQueue();

            }
            while (activePromises > 0 || promisesQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            setData(newData);
            localStorage.setItem('base_addresses', JSON.stringify(newData));
        } catch (error) {
            notification.error({
                message: "错误",
                description: error.message,
            });
        } finally {
            setBatchLoading(false);
            setBatchProgress(0);
            batchForm.resetFields();
            setSelectedKeys([]);
            message.success("地址添加成功");
        }
    };


    const showModal = () => {
        setIsModalVisible(true);
    };
    const showBatchModal = () => {
        
        if (apiKey === null) {
            notification.error({
                message: "请先填写API Key",
                description: "完成API配置 再添加地址",
                duration: 10,
            });
            return;
        }
        setIsBatchModalVisible(true);
    };
    const exportToExcelFile = () => {
        exportToExcel(data, 'walletInfo');
    }
    useEffect(() => {
        setTableLoading(true);
        const storedAddresses = localStorage.getItem('base_addresses');
        setTimeout(() => {
            setTableLoading(false);
        }, 500);
        if (storedAddresses) {
            setData(JSON.parse(storedAddresses));
            setScoreData(JSON.parse(storedAddresses));
        }
    }, []);
    useEffect(() => {
        const newData = [...data];
      
        for (const item of newData) {
          setTimeout(async () => {
            const score = await calculateScore(item);
            item.base_score = score;
            
            const allScoresCalculated = newData.every(item => item.zk_score !== undefined);
            
            if (allScoresCalculated) {
              setData(newData);
            }
          }, 0);
        }
      }, [scoreData]);
    const handleCancel = () => {
        setIsModalVisible(false);
    };
    const handleDelete = (key) => {
        setData(data.filter(item => item.key !== key));
        localStorage.setItem('base_addresses', JSON.stringify(data.filter(item => item.key !== key)));
    }
    const handleDeleteSelected = () => {
        if (!selectedKeys.length) {
            notification.error({
                message: "错误",
                description: "请先选择要删除的地址",
            }, 2);
            return;
        }
        setData(data.filter(item => !selectedKeys.includes(item.key)));
        localStorage.setItem('base_addresses', JSON.stringify(data.filter(item => !selectedKeys.includes(item.key))));
        setSelectedKeys([]);
    }
    const rowSelection = {
        selectedRowKeys: selectedKeys,
        onChange: (selectedRowKeys) => {
            setSelectedKeys(selectedRowKeys);
        },
        fixed: true // 固定选择框列
    };
    const handleBatchCancel = () => {
        setIsBatchModalVisible(false);
    };
    const [editingKey, setEditingKey] = useState(null);

    // 添加一个全局函数来检查所有行并刷新含有 NaN 的行
    const checkAndRefreshNaNRows = () => {
        console.log("检查并刷新所有含 NaN 的行");
        
        // 先检查 ETH 列
        const ethNaNRows = data.filter(item => {
            const isEthNaN = 
                item.eth_balance === "NaN" || 
                (typeof item.eth_balance === 'number' && isNaN(item.eth_balance)) || 
                String(item.eth_balance) === "NaN";
                
            return isEthNaN && !item._ethRefreshAttempted;
        });
        
        console.log("找到的 ETH 列含 NaN 行数:", ethNaNRows.length);
        
        if (ethNaNRows.length > 0) {
            // 一次只刷新一行
            const rowToRefresh = ethNaNRows[0];
            console.log("准备刷新 ETH 列:", rowToRefresh.key, rowToRefresh.address);
            
            // 标记为已尝试刷新
            const index = data.findIndex(item => item.key === rowToRefresh.key);
            if (index !== -1) {
                const newData = [...data];
                newData[index]._ethRefreshAttempted = true;
                newData[index].eth_balance = null; // 显示加载状态
                setData(newData);
            }
            
            // 刷新该行的 ETH 余额
            message.info(`正在刷新 ETH 余额: ${rowToRefresh.address.substring(0, 6)}...`);
            refreshEthBalance(rowToRefresh.key);
            
            // 设置定时器，稍后检查其他行
            setTimeout(checkAndRefreshNaNRows, 5000); // 5秒后再次检查
            return;
        }
        
        // 然后检查其他列
        const nanRows = data.filter(item => {
            // 检查 ETH 列是否为 NaN
            const isEthNaN = 
                item.eth_balance === "NaN" || 
                (typeof item.eth_balance === 'number' && isNaN(item.eth_balance)) || 
                String(item.eth_balance) === "NaN";
                
            // 检查其他可能的 NaN 列
            const isOtherNaN = 
                item.base_eth_balance === "NaN" || 
                (typeof item.base_eth_balance === 'number' && isNaN(item.base_eth_balance)) ||
                String(item.base_eth_balance) === "NaN";
                
            return isEthNaN || isOtherNaN;
        });
        
        console.log("找到的含 NaN 行数:", nanRows.length);
        
        if (nanRows.length > 0) {
            // 一次只刷新一行，避免过多请求
            const rowToRefresh = nanRows[0];
            console.log("准备刷新行:", rowToRefresh.key, rowToRefresh.address);
            
            // 标记为已尝试刷新
            const index = data.findIndex(item => item.key === rowToRefresh.key);
            if (index !== -1) {
                const newData = [...data];
                newData[index]._nanRefreshAttempted = true;
                setData(newData);
            }
            
            // 刷新该行
            message.info(`正在刷新含 NaN 值的地址: ${rowToRefresh.address.substring(0, 6)}...`);
            refreshSingleAddress(rowToRefresh.key);
            
            // 设置定时器，稍后检查其他行
            setTimeout(checkAndRefreshNaNRows, 10000); // 10秒后再次检查
        }
    };

    // 修改 refreshSingleAddress 函数，确保更可靠地处理 NaN
    const refreshSingleAddress = async (key) => {
        console.log("开始刷新单个地址:", key);
        try {
            const newData = [...data];
            const index = newData.findIndex(item => item.key === key);
            
            if (index === -1) {
                console.error("未找到要刷新的地址:", key);
                return;
            }
            
            const item = newData[index];
            item.query_date = getCurrentChinaDate();
            
            // 刷新 ETH 余额
            item.eth_balance = null; // 先设为 null 显示加载状态
            setData([...newData]); // 立即更新 UI
            
            try {
                let eth_balance;
                let retryCount = 0;
                const maxRetries = 5;
                
                while (retryCount <= maxRetries) {
                    try {
                        eth_balance = await getEthBalance(item.address, "ethereum");
                        console.log(`尝试 ${retryCount}: getEthBalance 结果:`, eth_balance, 
                                    "类型:", typeof eth_balance, 
                                    "是否NaN:", typeof eth_balance === 'number' && isNaN(eth_balance));
                        
                        // 明确检查 NaN
                        if (typeof eth_balance === 'number' && isNaN(eth_balance)) {
                            if (retryCount < maxRetries) {
                                retryCount++;
                                message.info(`ETH 余额为 NaN，正在进行第${retryCount}次重试...`, 2);
                                console.log(`ETH 余额为 NaN，正在进行第${retryCount}次重试`);
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                continue;
                            } else {
                                console.log("达到最大重试次数，将 NaN 转换为 Error");
                                eth_balance = "Error";
                                break;
                            }
                        }
                        
                        // 如果不是 NaN，跳出循环
                        break;
                        
                    } catch (error) {
                        console.error(`尝试 ${retryCount} 出错:`, error);
                        if (retryCount < maxRetries) {
                            retryCount++;
                            message.info(`请求出错，正在进行第${retryCount}次重试...`, 2);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        } else {
                            console.log("达到最大重试次数，设置为 Error");
                            eth_balance = "Error";
                            break;
                        }
                    }
                }
                
                item.eth_balance = eth_balance;
                setData([...newData]);
                localStorage.setItem('base_addresses', JSON.stringify(newData));
            } catch (error) {
                console.error("处理 getEthBalance 最终出错:", error);
                item.eth_balance = "Error";
                setData([...newData]);
                localStorage.setItem('base_addresses', JSON.stringify(newData));
            }
            
            message.success(`地址 ${item.address.substring(0, 6)}... 刷新成功`);
        } catch (error) {
            console.error("刷新单个地址出错:", error);
            message.error("刷新失败: " + error.message);
        }
    };

    // 在组件加载时启动 NaN 检查
    useEffect(() => {
        // 延迟几秒启动，确保表格已经渲染
        const timer = setTimeout(() => {
            checkAndRefreshNaNRows();
        }, 3000);
        
        return () => clearTimeout(timer);
    }, []);

    // 添加专门用于刷新 ETH 余额的函数
    const refreshEthBalance = async (key) => {
        console.log("开始刷新 ETH 余额:", key);
        try {
            const newData = [...data];
            const index = newData.findIndex(item => item.key === key);
            
            if (index === -1) {
                console.error("未找到要刷新的地址:", key);
                return;
            }
            
            const item = newData[index];
            
            try {
                let eth_balance;
                let retryCount = 0;
                const maxRetries = 5;
                
                while (retryCount <= maxRetries) {
                    try {
                        eth_balance = await getEthBalance(item.address, "ethereum");
                        console.log(`ETH 刷新尝试 ${retryCount}: 结果:`, eth_balance, 
                                    "类型:", typeof eth_balance, 
                                    "是否NaN:", typeof eth_balance === 'number' && isNaN(eth_balance));
                        
                        // 明确检查 NaN
                        if (typeof eth_balance === 'number' && isNaN(eth_balance)) {
                            if (retryCount < maxRetries) {
                                retryCount++;
                                message.info(`ETH 余额为 NaN，正在进行第${retryCount}次重试...`, 2);
                                console.log(`ETH 余额为 NaN，正在进行第${retryCount}次重试`);
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                continue;
                            } else {
                                console.log("达到最大重试次数，将 NaN 转换为 Error");
                                eth_balance = "Error";
                                break;
                            }
                        }
                        
                        // 如果不是 NaN，跳出循环
                        break;
                        
                    } catch (error) {
                        console.error(`ETH 刷新尝试 ${retryCount} 出错:`, error);
                        if (retryCount < maxRetries) {
                            retryCount++;
                            message.info(`ETH 请求出错，正在进行第${retryCount}次重试...`, 2);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        } else {
                            console.log("达到最大重试次数，设置为 Error");
                            eth_balance = "Error";
                            break;
                        }
                    }
                }
                
                item.eth_balance = eth_balance;
                setData([...newData]);
                localStorage.setItem('base_addresses', JSON.stringify(newData));
                
                console.log("ETH 余额刷新完成:", eth_balance);
            } catch (error) {
                console.error("处理 ETH 余额刷新最终出错:", error);
                item.eth_balance = "Error";
                setData([...newData]);
                localStorage.setItem('base_addresses', JSON.stringify(newData));
            }
        } catch (error) {
            console.error("刷新 ETH 余额出错:", error);
            message.error("ETH 余额刷新失败: " + error.message);
        }
    };

    // 修改 refreshAllEthNaN 函数，添加超时处理
    const refreshAllEthNaN = async () => {
        console.log("开始刷新所有 ETH NaN 值");
        message.info("开始刷新所有 ETH NaN 值");
        
        // 找出所有 ETH 列为 NaN 或加载中的行
        const nanRows = data.filter(item => {
            return item.eth_balance === "NaN" || 
                   (typeof item.eth_balance === 'number' && isNaN(item.eth_balance)) || 
                   String(item.eth_balance) === "NaN" ||
                   item.eth_balance === null || // 加载中状态
                   (typeof item.eth_balance === 'object' && item.eth_balance !== null); // Spin 组件
        });
        
        console.log(`找到 ${nanRows.length} 行含有 NaN 或加载中的 ETH 值`);
        
        if (nanRows.length === 0) {
            message.info("没有找到含有 NaN 或加载中的 ETH 值");
            return;
        }
        
        // 先将所有 NaN 值设为固定文本，避免显示加载状态
        const newData = [...data];
        for (const row of nanRows) {
            const index = newData.findIndex(item => item.key === row.key);
            if (index !== -1) {
                newData[index].eth_balance = "刷新中...";
            }
        }
        setData([...newData]);
        
        // 逐个刷新
        for (const row of nanRows) {
            try {
                message.info(`正在刷新地址 ${row.address.substring(0, 6)}... 的 ETH 余额`);
                
                // 获取 ETH 余额，使用 Promise.race 添加超时
                let eth_balance;
                let success = false;
                
                for (let i = 0; i < 5; i++) {
                    try {
                        // 添加超时处理
                        eth_balance = await Promise.race([
                            getEthBalance(row.address, "ethereum"),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('请求超时')), 15000)
                            )
                        ]);
                        
                        console.log(`尝试 ${i+1}: ETH 余额 =`, eth_balance);
                        
                        // 检查是否为 NaN
                        if (typeof eth_balance === 'number' && isNaN(eth_balance)) {
                            console.log(`尝试 ${i+1}: 仍然是 NaN，继续重试`);
                            if (i < 4) {
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                continue;
                            }
                        } else {
                            success = true;
                            break;
                        }
                    } catch (error) {
                        console.error(`尝试 ${i+1} 出错:`, error);
                        message.error(`尝试 ${i+1} 出错: ${error.message}`);
                        if (i < 4) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                }
                
                // 更新数据
                const index = newData.findIndex(item => item.key === row.key);
                if (index !== -1) {
                    newData[index].eth_balance = success ? eth_balance : "Error";
                    setData([...newData]);
                    localStorage.setItem('base_addresses', JSON.stringify(newData));
                }
                
                // 等待一段时间再处理下一个，避免请求过于频繁
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error("刷新 ETH 余额出错:", error);
                message.error(`刷新地址 ${row.address.substring(0, 6)}... 的 ETH 余额失败: ${error.message}`);
                
                // 确保即使出错也更新状态为 Error
                const index = newData.findIndex(item => item.key === row.key);
                if (index !== -1) {
                    newData[index].eth_balance = "Error";
                    setData([...newData]);
                    localStorage.setItem('base_addresses', JSON.stringify(newData));
                }
            }
        }
        
        message.success("所有 ETH NaN 值刷新完成");
    };

    // 修改 getEthBalance 函数的调用方式，确保不会卡住
    const getEthBalanceWithTimeout = async (address, chain) => {
        try {
            return await Promise.race([
                getEthBalance(address, chain),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('请求超时')), 15000)
                )
            ]);
        } catch (error) {
            console.error("getEthBalance 超时或出错:", error);
            return "Error";
        }
    };

    const toggleAddressDisplay = (mode) => {
        setAddressDisplayMode(mode);
        localStorage.setItem('base_address_display_mode', mode); // 保存到localStorage
    };

    const columns = [
        {
            title: "#",
            dataIndex: "key",
            key: "index",
            align: "center",
            width: 50,
            fixed: 'left', // 固定在左侧
            render: (text, record, index) => index + 1
        },
        {
            title: "备注",
            dataIndex: "name",
            key: "name",
            align: "center",
            render: (text, record) => {
                const isEditing = record.key === editingKey;
                return isEditing ? (
                    <Input
                        placeholder="请输入备注"
                        defaultValue={text}
                        onPressEnter={(e) => {
                            record.name = e.target.value;
                            setData([...data]);
                            localStorage.setItem('base_addresses', JSON.stringify(data));
                            setEditingKey(null);
                        }}
                    />
                ) : (
                    <>
                        <Tag color="blue" onClick={() => setEditingKey(record.key)}>
                            {text}
                            </Tag>
                            {!text && (
                            <Button
                                shape="circle"
                                icon={<EditOutlined />}
                                size="small"
                                onClick={() => setEditingKey(record.key)}
                            />
                        )}
                    </>
                );
            },
            width: 90
        },
        {
            title: (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>钱包地址</span>
                    <div>
                        <Tooltip title="完整显示">
                            <Button 
                                type="text" 
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAddressDisplay('full');
                                }}
                                style={{ 
                                    marginLeft: 4,
                                    color: addressDisplayMode === 'full' ? '#1890ff' : 'inherit'
                                }}
                                size="small"
                            />
                        </Tooltip>
                        <Tooltip title="部分隐藏">
                            <Button 
                                type="text" 
                                icon={<SyncOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAddressDisplay('partial');
                                }}
                                style={{ 
                                    marginLeft: 4,
                                    color: addressDisplayMode === 'partial' ? '#1890ff' : 'inherit'
                                }}
                                size="small"
                            />
                        </Tooltip>
                        <Tooltip title="完全隐藏">
                            <Button 
                                type="text" 
                                icon={<DeleteOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAddressDisplay('hidden');
                                }}
                                style={{ 
                                    marginLeft: 4,
                                    color: addressDisplayMode === 'hidden' ? '#1890ff' : 'inherit'
                                }}
                                size="small"
                            />
                        </Tooltip>
                    </div>
                </div>
            ),
            dataIndex: "address",
            key: "address",
            align: "center",
            width: addressDisplayMode === 'full' ? 200 : (addressDisplayMode === 'partial' ? 120 : 80),
            render: (text) => {
                if (addressDisplayMode === 'hidden') {
                    return "***";
                } else if (addressDisplayMode === 'partial') {
                    return text ? `***${text.slice(-4)}` : "";
                } else {
                    return text;
                }
            },
        },
        {
            title: "ETH",
            key: "eth_group",
            className: "zks_eth",
            children: [
                {
                    title: "ETH",
                    dataIndex: "eth_balance",
                    key: "eth_balance",
                    align: "center",
                    render: (text, record) => {
                        // 检查是否为 null（加载中）
                        if (text === null) {
                            return <Spin size="small" />;
                        }
                        
                        // 检查各种形式的 NaN
                        const isNaN = 
                            text === "NaN" || 
                            (typeof text === 'number' && isNaN(text)) || 
                            String(text) === "NaN";
                            
                        if (isNaN) {
                            console.log("ETH 列检测到 NaN:", record.key, record.address);
                            
                            // 如果尚未尝试刷新，则触发刷新
                            if (!record._ethRefreshAttempted) {
                                console.log("ETH 列触发刷新:", record.key);
                                
                                // 标记为已尝试刷新
                                record._ethRefreshAttempted = true;
                                
                                // 使用 setTimeout 避免渲染过程中修改状态
                                setTimeout(() => {
                                    console.log("执行 ETH 列的刷新:", record.key);
                                    // 直接更新数据，将 eth_balance 设为 null 显示加载状态
                                    const newData = [...data];
                                    const index = newData.findIndex(item => item.key === record.key);
                                    if (index !== -1) {
                                        newData[index].eth_balance = null;
                                        setData([...newData]);
                                        
                                        // 然后执行刷新
                                        refreshAllEthNaN();
                                    }
                                }, 500);
                                
                                return <Spin size="small" tip="重试中..." />;
                            }
                            
                            // 如果已尝试刷新但仍为 NaN，显示 NaN
                            return "NaN";
                        }
                        
                        return text;
                    },
                    width: 80
                },
                {
                    title: "Tx",
                    dataIndex: "eth_tx_amount",
                    key: "eth_tx_amount",
                    align: "center",
                    render: (text, record) => (text === null ? <Spin/> : text),
                    width: 80
                },
            ],
        },
        {
            title: "Base Mainnet",
            key: "zks_era_group",
            className: "zks_era",
            children: [
                {
                    title: "ETH",
                    dataIndex: "base_eth_balance",
                    key: "base_eth_balance",
                    align: "center",
                    render: (text, record) => {
                        if (text === null) {
                            return <Spin/>;
                        }
                        // 检查 NaN 并显示为 Error
                        if (typeof text === 'number' && isNaN(text)) {
                            return "Error";
                        }
                        return text;
                    },
                    width: 70
                },
                {
                    title: "USDC",
                    dataIndex: "base_usdc_balance",
                    key: "base_usdc_balance",
                    align: "center",
                    render: (text, record) => (text === null ? <Spin/> : text),
                    width: 70
                },
                {
                    title: "USDbC",
                    dataIndex: "base_usdbc_balance",
                    key: "base_usdbc_balance",
                    align: "center",
                    render: (text, record) => (text === null ? <Spin/> : text),
                    width: 70
                },
                {
                    title: 'Tx',
                    dataIndex: 'base_tx_amount',
                    key: 'base_tx_amount',
                    align: 'center',
                    sorter: (a, b) => a.base_tx_amount - b.base_tx_amount,
                    render: (text, record) => {
                        if (text === null) {
                          return <Spin />;
                        }
                  
                        const logarithmValue = Math.log(text);
                        const minValue = Math.log(1);
                        const maxValue = Math.log(100);
                        const normalizedValue = (logarithmValue - minValue) / (maxValue - minValue);
                  
                        const minOpacity = 0.1;
                        const maxOpacity = 1;
                        const opacity = normalizedValue * (maxOpacity - minOpacity) + minOpacity;
                  
                        const backgroundColor = `rgba(173, 216, 230, ${opacity})`; 
                  
                        return {
                          children: text,
                          props: {
                            style: {
                              background: backgroundColor,
                            },
                          },
                        };
                      },
                      width: 60
                    },
                {
                    title: "最后交易日期",
                    dataIndex: "base_last_tx_date",
                    key: "base_last_tx_date",
                    align: "center",
                    render: (text, record) => {
                        if (text === null) {
                            return <Spin />;
                        }
                        
                        // 如果文本是"Error"或"无交易"，直接返回
                        if (text === "Error" || text === "无交易") {
                            return text;
                        }
                        
                        // 计算日期差异
                        const txDate = new Date(text);
                        const now = new Date();
                        const diffTime = Math.abs(now - txDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        // 设置样式
                        let style = {};
                        
                        if (diffDays <= 3) {
                            // 3天内 - 绿色背景
                            style = { backgroundColor: '#4CAF50', padding: '2px 5px', borderRadius: '4px', color: 'white' };
                        } else if (diffDays >= 7) {
                            // 7天或更久 - 黄色背景
                            style = { backgroundColor: '#FFEB3B', padding: '2px 5px', borderRadius: '4px' };
                        } else if (diffDays > 3) {
                            // 3天前 - 红色文字
                            style = { color: 'red' };
                        }
                        
                        return <span style={style}>{text}</span>;
                    },
                    width: 90
                },
                {
                    title: "最后交易",
                    dataIndex: "base_last_tx",
                    key: "base_last_tx",
                    align: "center",
                    render: (text, record) => {
                        let textColor = "inherit";
                      
                        if (text === null) {
                          return <Spin />;
                        } else if (text?.includes("天") && parseInt(text) > 7) {
                            textColor = "red";
                        } else {
                          textColor = "#1677ff";
                        }
                      
                        return (
                          <a
                            href={"https://basescan.org/address/" + record.address}
                            target={"_blank"}
                            style={{ color: textColor }}
                          >
                            {text}
                          </a>
                        );
                      },
                    width: 90
                },
                {
                    title: "查询时间",
                    dataIndex: "query_date",
                    key: "query_date",
                    align: "center",
                    render: (text, record) => {
                        if (text === null) {
                            return <Spin />;
                        }
                        
                        // 计算日期差异
                        const queryDate = new Date(text);
                        const now = new Date();
                        const diffTime = Math.abs(now - queryDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        // 设置样式
                        let style = {};
                        
                        if (diffDays <= 3) {
                            // 3天内 - 绿色背景
                            style = { backgroundColor: '#4CAF50', padding: '2px 5px', borderRadius: '4px', color: 'white' };
                        } else if (diffDays >= 7) {
                            // 7天或更久 - 黄色背景
                            style = { backgroundColor: '#FFEB3B', padding: '2px 5px', borderRadius: '4px' };
                        } else if (diffDays > 3) {
                            // 3天前 - 红色文字
                            style = { color: 'red' };
                        }
                        
                        return <span style={style}>{text}</span>;
                    },
                    width: 120
                },
                {
                    title: "官方桥跨链Tx数",
                    key: "cross_chain_tx_count_group",
                    children: [
                        {
                            title: "L1->L2",
                            dataIndex: "l1Tol2Times",
                            key: "l1Tol2Times",
                            align: "center",
                            sorter: (a, b) => a.l1Tol2Times - b.l1Tol2Times,
                            render: (text, record) => (text === null ? "/" : text),
                            width: 65
                        },
                        {
                            title: "L2->L1",
                            dataIndex: "l2Tol1Times",
                            key: "l2Tol1Times",
                            align: "center",
                            render: (text, record) => (text === null ? "/" : text),
                            width: 55
                        },
                    ],
                },
                {
                    title: "官方桥跨链金额",
                    key: "cross_chain_amount_group",
                    children: [
                        {
                            title: "L1->L2",
                            dataIndex: "l1Tol2Amount",
                            key: "l1Tol2Amount",
                            align: "center",
                            render: (text, record) => (text === null ? "/" : text),
                            width: 55
                        },
                        {
                            title: "L2->L1",
                            dataIndex: "l2Tol1Amount",
                            key: "l2Tol1Amount",
                            align: "center",
                            render: (text, record) => (text === null ? "/" : text),
                            width: 55
                        },
                    ],
                },
                {
                    title: "活跃统计",
                    key: "activity_stats_group",
                    children: [
                        {
                            title: "日",
                            dataIndex: "dayActivity",
                            key: "dayActivity",
                            align: "center",
                            sorter: (a, b) => a.dayActivity - b.dayActivity,
                            render: (text, record) => (text === null ? <Spin/> : text),
                            width: 55
                        },
                        {
                            title: "周",
                            dataIndex: "weekActivity",
                            key: "weekActivity",
                            align: "center",
                            sorter: (a, b) => a.weekActivity - b.weekActivity,
                            render: (text, record) => (text === null ? <Spin/> : text),
                            width: 50
                        },
                        {
                            title: "月",
                            dataIndex: "monthActivity",
                            key: "monthActivity",
                            align: "center",
                            render: (text, record) => (text === null ? <Spin/> : text),
                            width: 50
                        },
                        {
                            title: "不同合约",
                            dataIndex: "contractActivity",
                            key: "contractActivity",
                            align: "center",
                            render: (text, record) => (text === null ? <Spin/> : text),
                            width: 85
                        },
                        {
                            title: "金额(U)",
                            dataIndex: "totalExchangeAmount",
                            key: "totalExchangeAmount",
                            align: "center",
                            sorter: (a, b) => a.totalExchangeAmount - b.totalExchangeAmount,
                            render: (text, record) => {
                                if (text === null) {
                                  return "/";
                                }
                          
                                const logarithmValue = Math.log(text);
                                const minValue = Math.log(1);
                                const maxValue = Math.log(100);
                                const normalizedValue = (logarithmValue - minValue) / (maxValue - minValue);
                          
                                const minOpacity = 0.1;
                                const maxOpacity = 1;
                                const opacity = normalizedValue * (maxOpacity - minOpacity) + minOpacity;
                          
                                const backgroundColor = `rgba(211, 211, 211, ${opacity})`; 
                          
                                return {
                                  children: text,
                                  props: {
                                    style: {
                                      background: backgroundColor,
                                    },
                                  },
                                };
                              },
                              width: 90
                            },
                        {
                            title: "FeeΞ",
                            dataIndex: "totalFee",
                            key: "totalFee",
                            align: "center",
                            render: (text, record) => (text === null ? <Spin/> : text),
                            width: 80
                        }
                    ],
                },
            ],
        },
        {
            title: "评分",
            dataIndex: "base_score",
            key: "base_score",
            align: "center",
            sorter: (a, b) => a.base_score - b.base_score,
            render: (text, record) => {
                if (text === null) {
                  return <Spin />;
                }
          
                const logarithmValue = Math.log(text);
                const minValue = Math.log(1);
                const maxValue = Math.log(100);
                const normalizedValue = (logarithmValue - minValue) / (maxValue - minValue);
          
                const minOpacity = 0.1;
                const maxOpacity = 1;
                const opacity = normalizedValue * (maxOpacity - minOpacity) + minOpacity;
          
                const backgroundColor = `rgba(240, 121, 78, ${opacity})`; 
          
                return {
                  children: text,
                  props: {
                    style: {
                      background: backgroundColor,
                    },
                  },
                };
              },
            width: 70
        },
        {
            title: "操作",
            key: "action",
            align: "center",
            render: (text, record) => (
                <Space size="small">
                    <Popconfirm title={"确认删除？"} onConfirm={() => handleDelete(record.key)}>
                        <Button icon={<DeleteOutlined/>}/>
                    </Popconfirm>
                </Space>
            ),
            width: 70
        },
    ];

    // 修改 selectNaNRows 函数，使用更直接的方法检测 NaN
    const selectNaNRows = () => {
        const nanKeys = data
            .filter(item => {
                // 直接检查显示为 "NaN" 的字符串或实际的 NaN 值
                return (
                    // 检查 ETH 列
                    item.eth_balance === "NaN" || 
                    (typeof item.eth_balance === 'number' && isNaN(item.eth_balance)) ||
                    String(item.eth_balance) === "NaN" ||
                    
                    // 检查 ETH Tx 列
                    item.eth_tx_amount === "NaN" || 
                    (typeof item.eth_tx_amount === 'number' && isNaN(item.eth_tx_amount)) ||
                    String(item.eth_tx_amount) === "NaN" ||
                    
                    // 检查 Base ETH 列
                    item.base_eth_balance === "NaN" || 
                    (typeof item.base_eth_balance === 'number' && isNaN(item.base_eth_balance)) ||
                    String(item.base_eth_balance) === "NaN" ||
                    
                    // 检查其他列
                    // ... 可以根据需要添加更多列的检查
                    
                    // 使用通用方法检查所有属性
                    Object.values(item).some(val => 
                        val === "NaN" || 
                        (typeof val === 'number' && isNaN(val)) ||
                        String(val) === "NaN"
                    )
                );
            })
            .map(item => item.key);
        
        console.log("找到的含 NaN 行:", nanKeys);
        console.log("数据样本:", data.slice(0, 3));
        
        if (nanKeys.length > 0) {
            setSelectedKeys(nanKeys);
            message.success(`已选择 ${nanKeys.length} 个含有 NaN 值的行`);
        } else {
            // 添加更多日志以便调试
            console.log("未找到含 NaN 的行，检查所有数据:");
            data.forEach((item, index) => {
                console.log(`行 ${index}:`, {
                    key: item.key,
                    eth_balance: item.eth_balance,
                    eth_balance_type: typeof item.eth_balance,
                    base_eth_balance: item.base_eth_balance,
                    base_eth_balance_type: typeof item.base_eth_balance
                });
            });
            
            message.info('没有找到含有 NaN 值的行');
        }
    };

    return (
        <div>
            <Content>
                <Modal title="批量添加地址" open={isBatchModalVisible} onOk={handleBatchOk}
                       onCancel={handleBatchCancel}
                       okButtonProps={{loading: isLoading}}
                       okText={"添加地址"}
                       cancelText={"取消"}
                >
                    <Form form={batchForm} layout="vertical">
                        <Form.Item label="地址" name="addresses" rules={[{required: true}]}>
                            <TextArea placeholder="请输入地址，每行一个  要添加备注时放在地址后以逗号(,)间隔" style={{width: "500px", height: "200px"}}/>
                        </Form.Item>
                    </Form>
                </Modal>
                <Modal
                    title={
                        <>
                            <div>更换API Key</div>
                            <div style={{fontSize: '12px', color: '#888'}}>
                                <Space>
                                    <Button type="link"
                                            onClick={() => window.open('https://basescan.org/myapikey', '_blank')}>注册Basescan API</Button>
                                </Space>
                            </div>
                        </>
                    }
                    open={isChangeApiModalVisible} onOk={handleChangeApiOk}
                    onCancel={() => setIsChangeApiModalVisible(false)}
                    okText={"确定"}
                    cancelText={"取消"}
                >
                    <Form form={changeApiForm} layout="horizontal">
                        <Form.Item label="Base" name="base">
                            <Input placeholder="请输入basescan API Key"/>
                        </Form.Item>
                    </Form>
                </Modal>
                <Spin spinning={tableLoading}>
                    <Table
                        dataSource={data}
                        columns={columns}
                        rowSelection={rowSelection}
                        pagination={false}
                        size="small"
                        loading={tableLoading}
                        scroll={{ 
                            x: 1500, // 设置一个具体的宽度
                            y: tableHeight 
                        }}
                        tableLayout="fixed" // 使用固定布局
                        summary={pageData => {
                            let ethBalance = 0;
                            let baseEthBalance = 0;
                            let baseUsdcBalance = 0;
                            let baseUsdbcBalance = 0;
                            let totalFees = 0;
                            let avgTx = 0;
                            let avgDay = 0;
                            let avgWeek = 0;
                            let avgMonth = 0;
                            let avgContract = 0;
                            let avgAmount = 0;
                            let avgScore = 0;
                            pageData.forEach(({
                                eth_balance,
                                base_eth_balance,
                                base_usdc_balance,
                                base_usdbc_balance,
                                base_tx_amount,
                                totalFee,
                                dayActivity,
                                weekActivity,
                                monthActivity,
                                contractActivity,
                                totalExchangeAmount,
                                base_score
                            }) => {
                                ethBalance += Number(eth_balance);
                                baseEthBalance += Number(base_eth_balance);
                                baseUsdcBalance += Number(base_usdc_balance);
                                baseUsdbcBalance += Number(base_usdbc_balance);
                                totalFees += Number(totalFee);
                                avgTx += Number(base_tx_amount);
                                avgDay += Number(dayActivity);
                                avgWeek += Number(weekActivity);
                                avgMonth += Number(monthActivity);
                                avgContract += Number(contractActivity);
                                avgAmount += Number(totalExchangeAmount);
                                avgScore += Number(base_score);
                            })
                            avgTx = avgTx / pageData.length;
                            avgDay = avgDay / pageData.length;
                            avgWeek = avgWeek / pageData.length;
                            avgMonth = avgMonth / pageData.length;
                            avgContract = avgContract / pageData.length;
                            avgAmount = avgAmount / pageData.length;
                            avgScore = avgScore / pageData.length;
                            const emptyCells = Array(5).fill().map((_, index) => <Table.Summary.Cell key={index} index={index + 11}/>);

                            return (
                                <>
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={4}>总计</Table.Summary.Cell>
                                        <Table.Summary.Cell index={4}>{ethBalance.toFixed(4)}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={5}/>
                                        <Table.Summary.Cell index={8}>{baseEthBalance.toFixed(4)}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={9}>{baseUsdcBalance.toFixed(2)}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={10}>{baseUsdbcBalance.toFixed(2)}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={11}>-{avgTx.toFixed(0)}-</Table.Summary.Cell>
                                        {emptyCells}
                                        <Table.Summary.Cell index={17}>-{avgDay.toFixed(0)}-</Table.Summary.Cell>
                                        <Table.Summary.Cell index={18}>-{avgWeek.toFixed(0)}-</Table.Summary.Cell>
                                        <Table.Summary.Cell index={19}>-{avgMonth.toFixed(0)}-</Table.Summary.Cell>
                                        <Table.Summary.Cell index={20}>-{avgContract.toFixed(0)}-</Table.Summary.Cell>
                                        <Table.Summary.Cell index={21}>-{avgAmount.toFixed(0)}-</Table.Summary.Cell>
                                        <Table.Summary.Cell index={22}>{totalFees.toFixed(4)}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={23}>-{avgScore.toFixed(0)}-</Table.Summary.Cell>
                                        <Table.Summary.Cell index={24}/>
                                    </Table.Summary.Row>
                                </>
                            )
                        }}
                        footer={() => (
                            <Card>
                                <div style={{ position: 'fixed', bottom: 0, width: '100%', backgroundColor: '#fff', padding: '10px 0', borderTop: '1px solid #e8e8e8', textAlign: 'center', zIndex: 1000 }}>
                                    <Row gutter={16} justify="center">
                                        <Col>
                                            <Button type="primary" icon={<SyncOutlined />} onClick={refreshAllEthNaN}>刷新ETH NaN值</Button>
                                        </Col>
                                        <Col>
                                            <Button type="primary" icon={<SyncOutlined />} onClick={selectNaNRows}>选择含NaN行</Button>
                                        </Col>
                                        <Col>
                                            <Button type="primary" icon={<SyncOutlined />} onClick={handleRefresh} loading={isLoading}>刷新选中地址</Button>
                                        </Col>
                                        <Col>
                                            <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>添加地址</Button>
                                        </Col>
                                        <Col>
                                            <Button type="primary" icon={<SettingOutlined />} onClick={() => setIsChangeApiModalVisible(true)}>更换API KEY</Button>
                                        </Col>
                                    </Row>
                                </div>
                            </Card>
                        )
                        }
                    />
                </Spin>
            </Content>
        </div>
    );
}

export default Base;
