VeriChain Starter - Demo (FREE)
Files included:
- index.html   -> Frontend demo (uses abi.json and contractAddress below)
- abi.json     -> ABI for the VeriChain contract
- verichain.sol -> Solidity contract source

CONTRACT ADDRESS (used in index.html):
0xd9145CCE52D386f254917e481eB44e9943F39138

HOW TO RUN (quick):
1. Keep all files in same folder and open index.html in a browser OR host using GitHub Pages/Netlify.
2. For full functionality (issue transactions) install MetaMask and connect to the same network where the contract is deployed.
   - If you used Remix VM, MetaMask connect won't talk to Remix VM; for local demo, use Remix UI to issue certificates and verify using Remix.
3. To use with a real testnet (Sepolia/Mumbai):
   - Deploy verichain.sol to Sepolia/Mumbai via Remix (Injected Web3 + MetaMask) and update contractAddress in index.html.
4. The abi.json file is included and index.html loads it automatically.

Important Notes:
- If you deployed on Remix VM, the VM data resets on page refresh. For stable demo use testnet deploy.
- If you want me to make a ZIP with these files for download, tell me and I'll provide the link.
