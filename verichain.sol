// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VeriChain {
    struct Certificate {
        string studentName;
        string courseName;
        string certHash;
        uint256 issueDate;
        address issuer;
    }

    mapping(string => Certificate) private certificates;

    event CertificateIssued(
        string certId,
        string studentName,
        string courseName,
        string certHash,
        uint256 issueDate,
        address issuer
    );

    function issueCertificate(
        string memory certId,
        string memory studentName,
        string memory courseName,
        string memory certHash
    ) public {
        certificates[certId] = Certificate(studentName, courseName, certHash, block.timestamp, msg.sender);
        emit CertificateIssued(certId, studentName, courseName, certHash, block.timestamp, msg.sender);
    }

    function verifyCertificate(string memory certId)
        public
        view
        returns (
            string memory studentName,
            string memory courseName,
            string memory certHash,
            uint256 issueDate,
            address issuer
        )
    {
        Certificate memory c = certificates[certId];
        return (c.studentName, c.courseName, c.certHash, c.issueDate, c.issuer);
    }
}
